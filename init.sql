-- Define variables for user, host, and password
SET @db_user = 'db_user';                -- The MySQL username
SET @db_user_password = 'db_user_password';  -- The MySQL user's password
SET @db_host = '%';                      -- The host for user access ('%' allows access from any host)

-- Connect as root and create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS chat_system;

-- Use the newly created database
USE chat_system;

-- Create user credentials table to store user email and hashed passwords
CREATE TABLE IF NOT EXISTS user_credentials (
    user_id INT AUTO_INCREMENT PRIMARY KEY,  -- Unique identifier for each user
    email VARCHAR(255) NOT NULL UNIQUE,  -- Unique email for each user
    salt VARCHAR(255) NOT NULL, -- Salt to hashed password
    password_hash VARCHAR(255) NOT NULL,  -- Securely store hashed password
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- User account creation time
);

-- Create tokens table to store authentication tokens
CREATE TABLE IF NOT EXISTS tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,  -- Unique identifier for each token
    user_id INT NOT NULL,  -- Foreign key linking to the user
    token VARCHAR(512) NOT NULL,  -- The actual authentication token
    expires_at TIMESTAMP NOT NULL,  -- Expiration time for token
    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- When the token was issued
    valid BOOLEAN DEFAULT TRUE,  -- Token validity flag
    CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES user_credentials(user_id) ON DELETE CASCADE  -- Delete tokens when user is deleted
);

-- Create chat history table to store user conversations
CREATE TABLE IF NOT EXISTS chat_history (
    chat_id INT AUTO_INCREMENT PRIMARY KEY,  -- Unique identifier for each chat entry
    user_id INT NOT NULL,  -- Foreign key linking to the user
    conversation_id VARCHAR(36) NOT NULL DEFAULT (UUID()),  -- Automatically generated unique conversation ID
    title VARCHAR(50),
    chat_content JSON NOT NULL,  -- Store chat data as JSON
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,  -- Timestamp for when the conversation was created
    FOREIGN KEY (user_id) REFERENCES user_credentials(user_id) ON DELETE CASCADE,  -- Delete chat history when user is deleted
    UNIQUE (conversation_id)  -- Ensure conversation_id is unique
);










-- Procedures
DELIMITER //

-- User management
-- Procedure to create a new user
CREATE PROCEDURE CreateUser (
    IN in_email VARCHAR(255),          -- New user's email
    IN in_password_hash VARCHAR(255),  -- Hashed password for the new user
    IN in_salt VARCHAR(255),           -- Salt to hash password
    OUT out_op_status BOOLEAN          -- Output flag indicating if the user was created successfully
)
BEGIN
        -- Check if the email already exists
    IF EXISTS (SELECT 1 FROM user_credentials WHERE email = in_email) THEN
        SET out_op_status = FALSE; -- User already exists
    ELSE
        -- Insert the new user
        INSERT INTO user_credentials (email, password_hash, salt)
        VALUES (in_email, in_password_hash, in_salt);
        SET out_op_status = (ROW_COUNT() > 0); -- New user created successfully
    END IF;
END //

-- Procedure to delete a user and all associated data (tokens, chat history) after validating email, password, and token
CREATE PROCEDURE DeleteUser (
    IN in_email VARCHAR(255),        -- User's email to delete
    IN in_password_hash VARCHAR(255),-- User's password hash to verify
    IN in_token VARCHAR(512),        -- User's token for validation
    OUT out_token_valid BOOLEAN,
    OUT out_op_status BOOLEAN        -- Output flag indicating if the user was deleted successfully
)
BEGIN
    DECLARE retrieved_user_id INT;
    DECLARE stored_password_hash VARCHAR(255);

    -- Step 1: Verify the token and email
    CALL VerifyToken(in_email, in_token, out_token_valid);

    -- If the token is valid, proceed to check the password
    IF out_token_valid THEN
        -- Step 2: Fetch the user's password hash
        SELECT user_id, password_hash INTO retrieved_user_id, stored_password_hash
        FROM user_credentials
        WHERE email = in_email;

        -- Step 3: Check if the provided password hash matches the stored password hash
        IF stored_password_hash = in_password_hash THEN
            -- Step 4: Delete the user and all associated data (cascade deletes chat history and tokens)
            DELETE FROM user_credentials WHERE user_id = retrieved_user_id;

            -- Step 5: Check if the user was successfully deleted
            IF ROW_COUNT() > 0 THEN
                SET out_op_status = TRUE;  -- User and associated data deleted successfully
            ELSE
                SET out_op_status = FALSE;  -- Failed to delete user
            END IF;
        ELSE
            -- Password mismatch, do not delete
            SET out_op_status = FALSE;  -- Incorrect password, deletion not allowed
        END IF;
    ELSE
        -- Invalid token, deletion not allowed
        SET out_op_status = FALSE;
    END IF;
END //











-- Authentication
-- Procedure to get salt per user
CREATE PROCEDURE ReadSalt(
    IN in_email VARCHAR(255),   -- User's email
    OUT out_salt VARCHAR(255),  -- Salt to hash password
    OUT out_op_status BOOLEAN   -- Output flag to indicate if the token was successfully created
)
BEGIN
    DECLARE count_salt INT;

    -- Check if the user exists
    SELECT COUNT(*) INTO count_salt
    FROM user_credentials
    WHERE email = in_email; 

    IF count_salt = 1 THEN
        SELECT salt INTO out_salt
        FROM user_credentials 
        WHERE email = in_email;

        SET out_op_status = TRUE;
    ELSE
        SET out_op_status = FALSE;
    END IF;

END //


-- Procedure to create a new token for a user after verifying their password, and set expiration based on duration (in hours)
CREATE PROCEDURE CreateToken (
    IN in_email VARCHAR(255),          -- User's email
    IN in_password_hash VARCHAR(255),  -- Provided hashed password
    IN in_duration_hours INT,          -- Token duration in hours
    OUT out_op_status BOOLEAN,         -- Output flag to indicate if the token was successfully created
    OUT out_token VARCHAR(512)         -- The newly created token
)
BEGIN
    DECLARE stored_password_hash VARCHAR(255);
    DECLARE retrieved_user_id INT;  -- Renaming the user_id variable to avoid conflict
    DECLARE expiration_time TIMESTAMP;

    -- Fetch the stored password hash and user_id for the given email
    SELECT password_hash, user_id INTO stored_password_hash, retrieved_user_id
    FROM user_credentials
    WHERE LOWER(email) = LOWER(in_email);  -- Case-insensitive comparison

    -- If no user is found, token creation fails
    IF retrieved_user_id IS NULL THEN
        SET out_op_status = FALSE;
    ELSEIF stored_password_hash != in_password_hash THEN
        -- If the password doesn't match, token creation fails
        SET out_op_status = FALSE;
    ELSE
        -- Delete expired tokens only
        DELETE FROM tokens WHERE user_id = retrieved_user_id AND expires_at < NOW();  -- Delete expired tokens only
        SET out_token = UUID();  -- Generate new token
        SET expiration_time = CURRENT_TIMESTAMP + INTERVAL in_duration_hours HOUR;  -- Calculate expiration based on the duration in hours
        INSERT INTO tokens (user_id, token, expires_at) VALUES (retrieved_user_id, out_token, expiration_time);  -- Save the new token with calculated expiration time
        SET out_op_status = (ROW_COUNT() > 0);  -- Indicate success
    END IF;
END //

-- Procedure to verify if a token is valid and tied to the correct email
CREATE PROCEDURE VerifyToken (
    IN in_email VARCHAR(255),  -- Email for additional verification
    IN in_token VARCHAR(512),  -- Token to be verified
    OUT out_op_status BOOLEAN  -- Output flag indicating if the token is valid
)
BEGIN
    DECLARE token_count INT DEFAULT 0;

    -- Check if the token is valid, not expired, and belongs to the correct user
    SELECT COUNT(*)
    INTO token_count
    FROM tokens t
    JOIN user_credentials u ON t.user_id = u.user_id
    WHERE t.token = in_token
    AND u.email = in_email  -- Ensure the email matches the user associated with the token
    AND t.valid = TRUE
    AND t.expires_at > NOW();  -- Token should not be expired

    -- Set output flag based on whether a valid token was found
    IF token_count = 1 THEN
        SET out_op_status = TRUE;  -- Token is valid
    ELSE
        SET out_op_status = FALSE;  -- Token is invalid or expired
    END IF;
END //

-- Procedure to delete a token when the user logs out, ensuring both token and email match
CREATE PROCEDURE DeleteToken (
    IN in_email VARCHAR(255),  -- User's email for validation
    IN in_token VARCHAR(512),  -- Token to be deleted
    OUT out_op_status BOOLEAN  -- Output flag to indicate if the token was successfully deleted
)
BEGIN
    DECLARE delete_count INT DEFAULT 0;

    -- Delete the token only if both the token and email match
    DELETE FROM tokens
    WHERE token = in_token
    AND user_id = (SELECT user_id FROM user_credentials WHERE email = in_email);

    SET delete_count = ROW_COUNT();  -- Get the number of rows affected by the deletion

    -- Check if the token was successfully deleted
    IF delete_count = 1 THEN
        SET out_op_status = TRUE;  -- Token successfully deleted
    ELSE
        SET out_op_status = FALSE;  -- Token deletion failed (either token or email didn't match)
    END IF;
END //










-- CRUD Operation on chat history
-- Procedure to read (get) chat history for a user with a valid token and matching email
CREATE PROCEDURE ReadChatHistory (
    IN in_email VARCHAR(255),     -- User's email for validation
    IN in_token VARCHAR(512),     -- User's token for validation
    OUT out_token_valid BOOLEAN,  -- Output flag indicating if the token is valid
    OUT out_op_status BOOLEAN     -- Output flag indicating if the chat history was read successfully
)
BEGIN
    DECLARE history_count INT;

    -- Verify the token and email
    CALL VerifyToken(in_email, in_token, out_token_valid);

    -- If token and email are valid, check for and return the user's chat history
    IF out_token_valid THEN
        -- First, check if there's any chat history
        SELECT COUNT(*) INTO history_count
        FROM chat_history c
        JOIN user_credentials u ON c.user_id = u.user_id
        WHERE u.email = in_email;

        -- Set out_op_status based on whether any chat history was found
        -- Chat history found, return it
        SELECT c.conversation_id, c.title, c.created_at
        FROM chat_history c
        JOIN user_credentials u ON c.user_id = u.user_id
        WHERE u.email = in_email;  -- Ensure email matches

        SET out_op_status = TRUE;  -- Chat history read successfully
    ELSE
        SET out_op_status = FALSE;  -- Invalid token, chat history not read
    END IF;
END //

-- Procedure to read (get) conversation from a user with valid token and matching email
CREATE PROCEDURE ReadConversation(
    IN in_email VARCHAR(255),           -- User's email for validation
    IN in_token VARCHAR(512),           -- User's token for vallidation
    IN in_conversation_id VARCHAR(36),  -- Conversation id to be retrived
    OUT out_token_valid BOOLEAN,            -- Output flag indicating if the token is valid
    OUT out_op_status BOOLEAN          -- Output flag indicating if the chat history was created successfully
)
BEGIN
    DECLARE conversation_count INT;

    -- Verify the token and email
    CALL VerifyToken(in_email, in_token, out_token_valid);

    -- If token and email are valid, check for and return conversation
    IF out_token_valid THEN
        -- First, check if the conversation exists
        SELECT COUNT(*) INTO conversation_count
        FROM chat_history c
        JOIN user_credentials u ON c.user_id = u.user_id
        WHERE u.email = in_email
        AND c.conversation_id = in_conversation_id;

        -- Set out_op_status based on whether the conversation was found
        IF conversation_count > 0 THEN
            -- Conversation found, return it
            SELECT c.conversation_id, c.title, c.chat_content, c.created_at
            FROM chat_history c
            JOIN user_credentials u ON c.user_id = u.user_id
            WHERE u.email = in_email
            AND c.conversation_id = in_conversation_id;

            SET out_op_status = TRUE;
        ELSE
            -- No conversation found
            SET out_op_status = FALSE;
        END IF;
    ELSE
        SET out_op_status = FALSE;
    END IF;  
END //

-- Procedure to create (add) chat history for a user with a valid token and matching email
CREATE PROCEDURE CreateConversation (
    IN in_email VARCHAR(255),             -- User's email for validation
    IN in_token VARCHAR(512),             -- User's token for validation
    IN in_title VARCHAR(50),              -- Title for the chat content
    IN in_chat_content JSON,              -- Chat content in JSON format
    OUT out_conversation_id VARCHAR(36),  -- Output string for the conversation ID
    OUT out_token_valid BOOLEAN,          -- Output flag indicating if the token is valid
    OUT out_op_status BOOLEAN            -- Output flag indicating if the chat history was created successfully
)
BEGIN
    DECLARE retrieved_user_id INT;

    -- Verify the token and email
    CALL VerifyToken(in_email, in_token, out_token_valid);

    -- If token and email are valid, insert the new chat history
    IF out_token_valid THEN
        -- Fetch the user_id corresponding to the email
        SELECT user_id INTO retrieved_user_id
        FROM user_credentials
        WHERE email = in_email;

        -- Insert chat content, conversation_id is automatically generated
        INSERT INTO chat_history (user_id, chat_content,title)
        VALUES (retrieved_user_id, in_chat_content,in_title);

        -- Retrieve the auto-generated conversation_id based on the last inserted chat_id
        SELECT conversation_id INTO out_conversation_id
        FROM chat_history
        WHERE chat_id = LAST_INSERT_ID();

        SET out_op_status = (ROW_COUNT() > 0);  -- Chat history created successfully
    ELSE
        SET out_op_status = FALSE;  -- Invalid token, chat history not created
    END IF;
END //




-- Procedure to update chat history for a user with a valid token and matching email
CREATE PROCEDURE UpdateConversation (
    IN in_email VARCHAR(255),           -- User's email for validation
    IN in_token VARCHAR(512),           -- User's token for validation
    IN in_conversation_id VARCHAR(36),  -- Unique conversation ID
    IN in_updated_chat_content JSON,    -- Updated chat content in JSON format
    OUT out_token_valid BOOLEAN,        -- Output flag indicating if the token is valid
    OUT out_op_status BOOLEAN           -- Output flag indicating if the chat history was updated successfully
)
BEGIN
    -- Verify the token and email
    CALL VerifyToken(in_email, in_token, out_token_valid);

    -- If token and email are valid, update the chat history
    IF out_token_valid THEN
        UPDATE chat_history c
        JOIN user_credentials u ON c.user_id = u.user_id
        SET chat_content = in_updated_chat_content
        WHERE u.email = in_email
        AND c.conversation_id = in_conversation_id;

        SET out_op_status = (ROW_COUNT() > 0);  -- Chat history updated successfully
    ELSE
        SET out_op_status = FALSE;  -- Invalid token, chat history not updated
    END IF;
END //

-- Procedure to delete chat history for a user with a valid token and matching email
CREATE PROCEDURE DeleteConversation (
    IN in_email VARCHAR(255),           -- User's email for validation
    IN in_token VARCHAR(512),           -- User's token for validation
    IN in_conversation_id VARCHAR(36),  -- Unique conversation ID
    OUT out_token_valid BOOLEAN,        -- Output flag indicating if the token is valid
    OUT out_op_status BOOLEAN           -- Output flag indicating if the chat history was deleted successfully
)
BEGIN

    -- Verify the token and email
    CALL VerifyToken(in_email, in_token, out_token_valid);

    -- If token and email are valid, delete the chat history
    IF out_token_valid THEN
        DELETE c
        FROM chat_history c
        JOIN user_credentials u ON c.user_id = u.user_id
        WHERE u.email = in_email
        AND c.conversation_id = in_conversation_id;

        SET out_op_status = (ROW_COUNT() > 0);  -- Chat history deleted successfully
    ELSE
        SET out_op_status = FALSE;  -- Invalid token, chat history not deleted
    END IF;
END //

DELIMITER ;










-- Setup Privilages
-- Step 1: Create a new user for the server to interact only with this database
SET @create_user = CONCAT('CREATE USER IF NOT EXISTS ''', @db_user, '''@''', @db_host, ''' IDENTIFIED BY ''', @db_user_password, ''';');
PREPARE stmt FROM @create_user;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 2: Grant EXECUTE privilege on specific stored procedures within the database
SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.CreateUser TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.ReadSalt TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.CreateToken TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.VerifyToken TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.DeleteToken TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.ReadChatHistory TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.CreateConversation TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.ReadConversation TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.UpdateConversation TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.DeleteConversation TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @grant_execute_procedure = CONCAT('GRANT EXECUTE ON PROCEDURE chat_system.DeleteUser TO ''', @db_user, '''@''', @db_host, ''';');
PREPARE stmt FROM @grant_execute_procedure;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- Flush privileges to ensure the changes take effect
FLUSH PRIVILEGES;
