# 需求

#### **2.1 功能性需求**
* **FR1**: 系统必须允许用户对当前加载的字幕（无论是来自Resolve还是SRT文件）发起AI优化流程。
* **FR2**: 系统应将字幕分批处理（默认为每批10条），以有效管理API请求负载并支持并行处理。
* **FR3**: 后端必须支持对字幕批次进行多线程或异步的并行处理，以提高整体性能。
* **FR4 (已修改)**: 针对每个字幕批次，系统必须构建一个**JSON对象**作为用户输入，其中包含带编号的字幕条目。系统还需构建一个包含**最终系统提示词 (System Prompt)** 的API请求。
* **FR5**: 系统必须实现一个缓存机制。当接收到与之前完全相同的字幕批次进行优化请求时，应直接返回缓存的结果，避免重复调用API。
* **FR6**: 系统必须包含一个 `SubtitleAligner` 组件，用于将LLM返回的优化文本与原始字幕的结构和时间码进行对齐，确保字幕条目和时间信息的完整性。
* **FR7 (新增)**: 在构建发送给LLM API的提示词时，系统**必须**仅包含字幕的文本内容，并**移除**所有的ID、时间码和其它元数据，以降低Token成本并确保模型专注于文本优化。
* **FR8 (新增)**: 系统应提供一个可选的文本输入区域，允许用户输入"参考信息"（如专有名词、内容上下文），这些信息将被包含在发送给LLM的提示词中，以提高修正的准确性。
* **FR9 (新增)**: AI优化功能应能根据提示词规则，对字幕文本中的代码（如函数调用）进行格式标准化，例如将 `print hello world` 修正为 `print('Hello World')`。

#### **2.2 非功能性需求**
* **NFR1**: 用户必须能够在应用中配置自己的OpenAI兼容API密钥和API端点地址，这些信息需要被安全地存储在本地。
* **NFR2**: 在AI优化过程中，系统应在UI上向用户提供清晰的状态反馈（例如：处理中、完成、错误）。
* **NFR3**: 缓存机制的性能应确保缓存查询的响应时间显著快于一次完整的API网络请求。

#### **2.3 兼容性需求**
* **CR1**: 新的AI优化功能不得影响或破坏现有的字幕编辑功能（如手动编辑、查找替换等）。
* **CR2**: 优化功能必须同时兼容从DaVinci Resolve提取的字幕和从SRT文件导入的字幕。
* **CR3**: 优化后的字幕必须保持与DaVinci Resolve字幕轨道兼容的格式，以便成功回录。

#### **2.4 提示词工程指南 (Prompt Engineering Guidelines)**
* **目标**: 提示词的核心目标是指导LLM为了清晰度、简洁性和语言流畅性而优化字幕文本，同时严格保持原始含义和字幕行数不变。
* **系统提示词 (System Prompt)**: 
    ```
    You are a subtitle correction expert. You will receive subtitle text and correct any errors while following specific rules.

    # Input Format
    - JSON object with numbered subtitle entries
    - Optional reference information/prompt with content context, terminology, and requirements
    
    # Correction Rules
    1. Preserve original sentence structure and expression - no synonyms or paraphrasing
    2. Remove filler words and non-verbal sounds (um, uh, laughter, coughing)
    3. Standardize:
       - Punctuation
       - English capitalization
       - Mathematical formulas in plain text (using ×, ÷, etc.)
       - Code variable names and functions
    4. Maintain one-to-one correspondence of subtitle numbers - no merging or splitting
    5. Prioritize provided reference information when available
    6. Keep original language (English→English, Chinese→Chinese)
    7. No translations or explanations
    
    # Output Format
    Pure JSON object with corrected subtitles:
    ```
    {
        "0": "[corrected subtitle]",
        "1": "[corrected subtitle]",
        ...
    }
    ```
    
    # Examples
    Input:
    ```
    {
        "0": "um today we'll learn about bython programming",
        "1": "it was created by guidoan rossum in uhh 1991",
        "2": "print hello world is an easy function *coughs*"
    }
    ```
    Reference:
    ```
    - Content: Python introduction
    - Terms: Python, Guido van Rossum
    ```
    Output:
    ```
    {
        "0": "Today we'll learn about Python programming",
        "1": "It was created by Guido van Rossum in 1991",
        "2": "print('Hello World') is an easy function"
    }
    ```
    
    # Notes
    - Preserve original meaning while fixing technical errors
    - No content additions or explanations in output
    - Output should be pure JSON without commentary
    - Keep the original language, do not translate.
    ```