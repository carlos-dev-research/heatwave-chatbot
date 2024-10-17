import argparse
import json

def main():
    parser = argparse.ArgumentParser(description="Setup Database MySQl heatwave")
    parser.add_argument('--db-host', help="The IP address of the database")
    parser.add_argument('--db-user', help="The password of the database user")
    parser.add_argument('--db-password', help="The password of the database user")
    parser.add_argument('--bucket', help="Bucket with documents to be loaded to the vector store")

    args = parser.parse_args()
    
    # Create config file for db connection
    config ={
        "host" : args.db_host,
        "user" : args.db_user,
        "password" : args.db_password,
        "database" : "chat_system"
    }

    with open('./config/config.json','w') as jf:
        json.dump(config,jf, indent=4)

    # Create db init file
    # Read
    with open('./templates/init.txt','r') as f:
        sql = f.read()
    # Format
    bucket = f"'{args.bucket}'"
    sql = sql.format(bucket=bucket)
    #writw
    with open('./init.sql','w') as f:
        f.write(sql)

if __name__ == "__main__":
    main()