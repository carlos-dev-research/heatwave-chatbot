import os
import re
import json



class SLM:
    def __init__(self,model_name,):
        self.model_name=model_name
    
    def prompt(self,chat_history,stream):
        return ollama.chat(model=self.model_name,messages=chat_history,stream=stream)


    def chat(self,chat_history, data_folder, is_stream=True):
        """
        System role message must always be the first
        """

        

        # Load chat_history or create new history 
        if len(chat_history)==1:
            memory = ChatMemoryBuffer.from_defaults(token_limit=1500)
        else:
            # Save all messages into memory except the last messag that is the current prompt
            memory = ChatMemoryBuffer.from_defaults(token_limit=1500)
            for message in chat_history[:-1]:
                memory.put(ChatMessage(role=message['role'],content=message['content']))
        

        
        # Current user input
        user_input = chat_history[-1]['content']

        # Use a template and tools for the user prompt
        yt_ft,context = self.check_for_videos(user_input)
        if yt_ft == 1:
            prompt = user_input
        elif yt_ft == 0:
            template = """Context:\n{context}\n|---------------------------------|\nUser input: \n{user_input}"""
            prompt = template.format(context=context,user_input=user_input)
        else:
            memory = ChatMemoryBuffer.from_defaults(token_limit=1500)
            prompt = """Write a message for user stating at the current moment is not possible to retrieve the youtube video from the web, Just answer with the message and nothing else.\nMessage:"""
        

        # Create chat engine with memory
        chat_engine = index.as_chat_engine(
            chat_mode = "context",
            memory = memory,
            system_prompt = (
                "You are my helpful assitant"
            )
        )


        print(prompt)
        if is_stream:
            response = chat_engine.stream_chat(prompt)
        else:
            reponse = chat_engine.chat(prompt)
        print("Send object streaming")

        return response
    
    def create_title(self,message) ->str:
        template="""
        Your only task is to create headline for the following text, the complete Output of the text should be less than 30 characters
        Text:{context}\n\n
        Headline: 
        """
        prompt =[{'role': 'user', 'content': template.format(context=message)}]
        title = self.prompt(chat_history=prompt,stream=False)
        return title['message']['content'][:45]
    
    @staticmethod
    def get_source_file_paths(response):
        source_nodes = response.source_nodes
        file_paths = set()
        for node in source_nodes:
            if 'file_path' in node.metadata:
                file_paths.add(node.metadata['file_path'])
        return list(file_paths)
    

        