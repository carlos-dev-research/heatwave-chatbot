from models import db
import json
from datetime import datetime
from typing import List, Tuple, Dict
import bcrypt

class session:
    def __init__(self, mydb:db, user:str, token:str):
        """
        Initialize instance from token
        """
        if session.verify_token(mydb,user,token):
            self.user = user
            self.mydb = mydb
            self.token = token
        else:
            raise RuntimeError("Session could not be created")

    @classmethod
    def hash_password(cls, mydb:db, user:str, password:str)-> str:
        """
        Hash password with bcrypt and stored salt in the database
        """
        stored_salt = cls.read_salt(mydb,user)
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), stored_salt.encode('utf-8')).decode('utf-8')
        return hashed_password

    @classmethod
    def from_password(cls, mydb:db, user:str, password:str, token_duration:int = 6):
        """
        Initialize instance from password
        """
        token = cls.create_token(mydb,user, password, token_duration)
        return cls(mydb,user,token)
        
    @classmethod
    def create_user(cls, mydb:db, user:str, password:str):
        """
        Procedure: CreateUser
        Parameters:
            IN in_email VARCHAR(255),          -- New user's email
            IN in_password_hash VARCHAR(255),  -- Hashed password for the new user
            IN in_salt VARCHAR(255),           -- Salt to hash password
            OUT out_op_status BOOLEAN          -- Output flag indicating if the user was created successfully
        """
        # Generate a random salt
        salt = bcrypt.gensalt()

        # Hash the password using bcrypt and the generated salt
        password_hash = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
        salt = salt.decode('utf-8')

        params, results = mydb.call_proc("CreateUser",[user, password_hash, salt, None])
        op_status = params[-1]
        if not op_status:
            raise RuntimeError("User was not able to be created")
        
    def delete_user(self, password:str, token:str):
        """
        Procedure: DeleteUser
        Parameters:
            IN in_email VARCHAR(255),        -- User's email to delete
            IN in_password_hash VARCHAR(255),-- User's password hash to verify
            IN in_token VARCHAR(512),        -- User's token for validation
            OUT out_token_valid BOOLEAN,     -- Output flag indicating the token was validated
            OUT out_op_status BOOLEAN        -- Output flag indicating if the user was deleted successfully
        """
        password_hash = session.hash_password(self.mydb, self.user, password)
        params, results = self.mydb.call_proc("DeleteUser",[self.user,password_hash,token,None,None])  
        token_valid = params[-2]
        op_status = params[-1]
        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("User was not able to be deleted")
    
    @classmethod
    def read_salt(cls, mydb:db, user:str)->str:
        """
        Procedure: ReadSalt
        Parameters:
            IN in_email VARCHAR(255),   -- User's email
            OUT out_salt VARCHAR(255),  -- Salt to hash password
            OUT out_op_status BOOLEAN   -- Output flag to indicate if the token was successfully created
        """
        params, results = mydb.call_proc("ReadSalt",[user,None,None])  
        salt = params[-2]
        op_status = params[-1]
        if not op_status:
            raise ValueError("User was not able to be authenticated")
        
        return salt



    @classmethod    
    def create_token(cls, mydb:db, user:str, password:str, duration_hours:int = 6) ->str:
        """
        Procedure: CreateToken
        Parameters:
            IN in_email VARCHAR(255),          -- User's email
            IN in_password_hash VARCHAR(255),  -- Provided hashed password
            IN in_duration_hours INT,          -- Token duration in hours
            OUT out_op_status BOOLEAN,         -- Output flag to indicate if the token was successfully created
            OUT out_token VARCHAR(512)         -- The newly created token
        """
        password_hash = cls.hash_password(mydb, user, password)
        params, results = mydb.call_proc("CreateToken",[user, password_hash, duration_hours, None, None])
        op_status = params[-2]
        token = params[-1]
        if not op_status or not isinstance(token,str):
            raise RuntimeError("User was not able to be authenticated")
        return token
    
    @classmethod
    def verify_token(cls, mydb:db, user:str, token:str):
        """
        Procedure: VerifyToken
        Paramaters:
            IN in_email VARCHAR(255),  -- Email for additional verification
            IN in_token VARCHAR(512),  -- Token to be verified
            OUT out_op_status BOOLEAN  -- Output flag indicating if the token is valid
        """
        params, results = mydb.call_proc("VerifyToken",[user,token,None])
        op_status = params[-1]
        return op_status

    
    def delete_token(self):
        """
        Procedure: DeleteToken
        Parameters:
            IN in_email VARCHAR(255),  -- User's email for validation
            IN in_token VARCHAR(512),  -- Token to be deleted
            OUT out_op_status BOOLEAN  -- Output flag to indicate if the token was successfully deleted
        """
        params, results = self.mydb.call_proc("DeleteToken",[self.user,self.token,None])
        op_status = params[-1]
        if not op_status:
            raise RuntimeError("Unable to Close Session")
        
    def read_chat_history(self) -> List[Tuple[str,str,datetime]] :
        """
        Procedure:ReadChatHistory 
        Parameters:
            IN in_email VARCHAR(255),     -- User's email for validation
            IN in_token VARCHAR(512),     -- User's token for validation
            OUT out_token_valid BOOLEAN,  -- Output flag indicating if the token is valid
            OUT out_op_status BOOLEAN     -- Output flag indicating if the chat history was read successfully
        Results:
            - First bracket level is for results from the procedure
            - Second bracket level is for rows
            - 3 Level are columns conversation_id,title,created date
            [[(conversation_id,title,created date)]]
        """
        params, results = self.mydb.call_proc("ReadChatHistory",[self.user, self.token, None, None])
        token_valid = params[-2]
        op_status = params[-1]

        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("Unable to read chat history")
        
        # Check if results is empty or contains no rows
        if not results or not results[0]:
            # Handle the case where no chat history is found
            return []  # Return an empty list to signify no history available
        
        return results[0]
        
    def create_conversation(self, title:str) -> str:
        """
        Procedure: CreateConversation
        Parameters:
            IN in_email VARCHAR(255),             -- User's email for validation
            IN in_token VARCHAR(512),             -- User's token for validation
            IN in_title VARCHAR(50),              -- Title for the chat content
            OUT out_conversation_id VARCHAR(36),  -- Output string for the conversation ID
            OUT out_token_valid BOOLEAN,          -- Output flag indicating if the token is valid
            OUT out_op_status BOOLEAN             -- Output flag indicating if the chat history was created successfully
        """
        params, results = self.mydb.call_proc("CreateConversation",[self.user, self.token, title, None, None, None])
        conversation_id = params[-3]
        token_valid = params[-2]
        op_status = params[-1]

        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("Unable to read chat history")
        
        return conversation_id
    
    def gen_text(self, prompt:str) -> str:
        """
        Procedure: genText
        Parameters:
            IN in_email VARCHAR(255),           -- User's email for validation
            IN in_token VARCHAR(512),           -- User's token for validation
            IN in_prompt TEXT,                  -- Description to generate text
            OUT out_token_valid BOOLEAN,        -- Output flag indicating if the token is valid
            OUT out_op_status BOOLEAN           -- Output flag indicating if the chat history was read successfully 
        """
        params, results = self.mydb.call_proc("genText",[self.user,self.token,prompt,None,None])
        token_valid = params[-2]
        op_status = params[-1]
        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("Unable to gen Text")
        
        # Unpack the chat history and convert form json to dictionary
        try:
            text = json.loads(results[0][0][0])['text']
        except:
            raise ValueError("Invalid Data")

        return text

    def read_conversation(self,conversation_id:str) -> Dict[str,List[Dict[str,str]]]:
        """
        Procedure: ReadConversation
        Parameters:
            IN in_email VARCHAR(255),           -- User's email for validation
            IN in_token VARCHAR(512),           -- User's token for vallidation
            IN in_conversation_id VARCHAR(36),  -- Conversation id to be retrived
            OUT out_token_valid BOOLEAN,        -- Output flag indicating if the token is valid
            OUT out_op_status BOOLEAN           -- Output flag indicating if the chat history was created successfully
        Results:
            - First bracket level is for results from the procedure
            - Second bracket level is for rows, in this case only one row should be retrieved
            - 3 Level are columns conversation_id,title,created date
            [[(conversation_id,title,chat_content,created date)]]
        """
        params, results = self.mydb.call_proc("ReadConversation",[self.user,self.token,conversation_id,None,None])
        token_valid = params[-2]
        op_status = params[-1]
        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("Unable to read conversation")
        
        # Unpack the chat history and convert form json to dictionary
        try:
            chat_content = json.loads(results[0][0][2])
        except:
            raise ValueError("Invalid Data")

        return chat_content
    
    def chat_db(self, conversation_id:str, new_message:str) -> Tuple[str,List[Dict[str,str]]]:
        """
        Procedure: chat
        Parameters:
            IN in_email VARCHAR(255),           -- User's email for validation
            IN in_token VARCHAR(512),           -- User's token for validation
            IN in_conversation_id VARCHAR(36),  -- Identifier of the conversation
            IN in_new_message TEXT,             -- User last prompt
            OUT out_token_valid BOOLEAN,        -- Output flag indicating if the token is valid
            OUT out_op_status BOOLEAN           -- Output flag indicating if the chat history was read successfully 
        """
        params, results = self.mydb.call_proc("chat",[self.user, self.token, conversation_id, new_message, None, None])
        token_valid = params[-2]
        op_status = params[-1]
        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("Unable to chat")
        
        # Unpack the chat history and convert form json to dictionary
        try:
            chat_response = results[0][0][0]
            documents = json.loads(results[0][0][1])
        except:
            raise ValueError("Invalid Data")

        return chat_response, documents
        
    def delete_conversation(self, conversation_id:str):
        """
        Procedure: DeleteConversation
        Parameters:
            IN in_email VARCHAR(255),           -- User's email for validation
            IN in_token VARCHAR(512),           -- User's token for validation
            IN in_conversation_id VARCHAR(36),  -- Unique conversation ID
            OUT out_token_valid BOOLEAN,        -- Output flag indicating if the token is valid
            OUT out_op_status BOOLEAN           -- Output flag indicating if the chat history was deleted successfully
        """
        params, results = self.mydb.call_proc("DeleteConversation",[self.user, self.token, conversation_id, None, None])
        token_valid = params[-2]
        op_status = params[-1]
        if not token_valid:
            raise ValueError("Token used is not valid")
        elif not op_status:
            raise RuntimeError("Unable to delete conversation")
        

    


         
