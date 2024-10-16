# Pre Requisite
1. Oracle Cloud Infrastructure Environment available.
2. Virtual Cloud Network with public (which allows traffic on port 5000 for Flask) and private subnet with proper policies and permissions.
3. Bucket with documents to be used by the RAG System.
4. Dynamic Group Setting to allow HeatWave to access the bucket with the documents.
5. HeatWave instance with Lakehouse enabled.
6. Compute Instance connected to public subnet.

For more information on how to set up the resources, you can check Oracle guides:
[RAG System Workshop Using HeatWave](https://apexapps.oracle.com/pls/apex/r/dbpm/livelabs/view-workshop?wid=4048)

# Getting started
1. Connect to the compute instance with the ssh key. For example
```bash
ssh -i ssh_private.key <compute_instance_public_ip>
```
2. Once in the compute instance, clone the repository and install dependencies
```bash
git clone https://github.com/carlos-dev-research/heatwave-chatbot.git
cd heatwave-chatbot
sudo apt update
sudo apt install python3 python3-pip mysql-client-core-8.0
pip install -r requirements.txt

# Note you can see an example of using the python cli tool in setup.sh
# The bucket variale is of format 'oci://BucketName@Namespace/Path/' go to bucket and format the proper string
python3 setup.py --db-host <host> --db-user <user> --db-password <password> --bucket <bucket>

# Note for the database to initialize the vector store it take some minutes
mysql -h <host> -u <user> -p < init.sql
```

3. If using ubuntu image, you need to open ports, and check the port has been enabled
```bash
sudo ufw enable
sudo ufw allow 5000/tcp
sudo ufw status verbose
```

4. Reboot instance and connect again

5. Initialize the server:
```bash
cd heatwave-chatbot
python3 run.py
```

6. The server will be available on the public IP assigned by OCI.

# Conclusions on Rag Systems

## Heatwave
- HeatWave allows for real-time analytics without the need for a separate ETL pipeline, saving time, cost, and complexity.
- It enables insights from unstructured data using LLMs directly within the database.
- By reducing the need for data movement, HeatWave helps create a more secure environment.

## Relations between chunks and context needed

Through the implementation and testing of a Retrieval-Augmented Generation (RAG) system, I observed that while RAG excels at retrieving specific pieces of information within document chunks, it faces limitations when handling queries requiring deeper contextual understanding. Since RAG divides information into manageable chunks, longer or more complex relationships within the text may not be fully captured, leading to inaccurate or incomplete responses. This is especially noticeable with open-ended questions or prompts that require the system to understand extended context across larger portions of the document base.

For more complex problems, like those that need a deeper understanding of a topic, RAG systems may not be the best fit. In these cases, a better approach might be to train or fine-tune models that are designed to learn and understand relationships in the data over time. This allows the model to make more informed decisions, especially when simple retrieval isn’t enough. Additionally, using special logic tailored to the specific use case and applying advanced prompt engineering techniques could be explored as a way to address some of these limitations and enhance system performance.

In contrast, RAG remains an optimal choice for retrieving well-defined data from documents where context can be contained within the retrieved chunks. It works effectively for tasks that involve locating specific information, as long as the relevant data is contained within the chunks retrieved.

It’s important to note that the conclusions drawn here are based on iterative testing and informal observations rather than formal studies. As such, they should be considered hypotheses. I encourage further research and experimentation to validate or expand upon these ideas, particularly when it comes to addressing the limitations and potential of RAG systems in handling complex queries.

## Prompt engineering to mitigate issues

RAG systems can deviate from the user’s prompt if proper prompt engineering isn’t applied. For example, querying "Hello" might result in the system retrieving unrelated information from its document store and making a conclusion about it, rather than simply responding with "Hello." This was observed with the "mistral-7b-instruct-v1" model.

# Useful content and Guides
[Heatwave Introduction](https://dev.mysql.com/doc/heatwave/en/mys-hw-introduction.html)

[Chat Session Details](https://dev.mysql.com/doc/heatwave/en/mys-hw-genai-chat-details.html)

[Heatwave Chat](https://dev.mysql.com/doc/heatwave/en/mys-hwgenai-hw-chat.html)

[Generating Vector Embeddings](https://dev.mysql.com/doc/heatwave/en/mys-hw-genai-generate-embeddings.html)

[Example of Heatwave Using Javascript Blocks](https://blogs.oracle.com/mysql/post/building-ecommerce-app-with-heatwave-genai)

[Generate LLM output with Column base operations](https://dev.mysql.com/doc/heatwave/en/mys-hw-genai-generate-content.html)

[Heatwave Use Case](https://blogs.oracle.com/mysql/post/heawave-genai-for-e-commerce-applications)

# Warnings
Accuracy: Content generated by the LLM might be inaccurate.
The repository is for educational purposes

# Licenses and Terms
If you plan on using or distributing this project, you must also comply with the licenses of all dependencies and tools used in the project.