# Synapse Subtitle Editor 棕地增强 PRD

### **1. 项目分析与背景**

#### **1.1 现有项目概览**
这是一个使用 **Tauri** 构建的桌面应用程序，前端采用 **React** 和 **TypeScript**，后端则是 **Python** 的 **FastAPI** 框架。其核心功能是作为DaVinci Resolve的字幕编辑器，支持字幕的提取、编辑（查找替换、去口水词）、以及回录，同时也支持本地SRT文件的导入导出。

#### **1.2 可用文档分析**
目前主要依赖源代码进行分析，缺少独立的正式技术或架构文档。

#### **1.3 增强范围定义**
* **增强类型**:
    * [x] 新功能添加
    * [x] 与新系统集成
* **增强描述**: 集成一个与OpenAI兼容的大语言模型API，为用户提供AI驱动的字幕优化功能。该功能将包括字幕分块处理、智能缓存机制和结果对齐修复，以提高处理效率、降低成本并确保字幕结构的完整性。
* **影响评估**:
    * [x] 重大影响 (需要对后端进行 substantial 的代码更改，并引入新的前端组件和外部API集成)

#### **1.4 目标与背景上下文**
* **目标**:
    * 为用户提供先进的、由AI驱动的字幕优化能力。
    * 通过大语言模型处理，提升字幕内容的质量和可读性。
    * 通过自动化复杂的编辑任务来提高用户效率。
    * 通过字幕分批处理和缓存机制，实现一个经济高效的解决方案。
* **背景上下文**:
    手动的字幕编辑和优化费时费力。本次功能增强旨在利用大型语言模型（LLM）的强大能力，自动化并提升字幕内容的质量，为用户提供一个在DaVinci Resolve工作流中快速、高效优化内容的强大工具。

#### **1.5 变更日志**
| 日期 | 版本 | 描述 | 作者 |
| :--- | :--- | :--- | :--- |
| 2025-09-07 | 0.2 | 定稿PRD草案 | John (PM) |
| 2025-09-06 | 0.1 | 初始PRD草案创建 | John (PM) |

---
### **2. 需求**

#### **2.1 功能性需求**
* **FR1**: 系统必须允许用户对当前加载的字幕（无论是来自Resolve还是SRT文件）发起AI优化流程。
* **FR2**: 系统应将字幕分批处理（默认为每批10条），以有效管理API请求负载并支持并行处理。
* **FR3**: 后端必须支持对字幕批次进行多线程或异步的并行处理，以提高整体性能。
* **FR4 (已修改)**: 针对每个字幕批次，系统必须构建一个**JSON对象**作为用户输入，其中包含带编号的字幕条目。系统还需构建一个包含**最终系统提示词 (System Prompt)** 的API请求。
* **FR5**: 系统必须实现一个缓存机制。当接收到与之前完全相同的字幕批次进行优化请求时，应直接返回缓存的结果，避免重复调用API。
* **FR6**: 系统必须包含一个 `SubtitleAligner` 组件，用于将LLM返回的优化文本与原始字幕的结构和时间码进行对齐，确保字幕条目和时间信息的完整性。
* **FR7 (新增)**: 在构建发送给LLM API的提示词时，系统**必须**仅包含字幕的文本内容，并**移除**所有的ID、时间码和其它元数据，以降低Token成本并确保模型专注于文本优化。
* **FR8 (新增)**: 系统应提供一个可选的文本输入区域，允许用户输入“参考信息”（如专有名词、内容上下文），这些信息将被包含在发送给LLM的提示词中，以提高修正的准确性。
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
---
### **3. 用户界面增强目标**

#### **3.1 与现有UI的集成**
新的AI优化功能UI将与现有应用的MUI组件库 和VS Code风格的深色主题 无缝集成。

#### **3.2 被修改或新增的屏幕/视图**
* **优化器侧边栏 (`OptimizerSidebar.tsx`)**: 在“去口水词”功能的**正下方**，增加一个新的区域用于“AI字幕优化”。此区域将包含：
    1.  一个与“一键去口水词”按钮**风格完全一致**的“AI优化字幕”按钮。
    2.  一个**可选的“参考信息”文本框**，供用户输入专有名词等上下文信息。
* **新的设置界面 (New Settings Page/Modal)**: 需要一个全新的界面，让用户可以输入、保存和管理他们的OpenAI兼容API密钥和端点地址。
* **新的结果审阅视图 (New Result Review View)**: 需要一个全新的模态窗口或全屏视图，以并排差异对比的形式展示优化前后的字幕，并提供“全部应用”和“取消”的操作选项。

#### **3.3 UI一致性需求**
新UI元素必须复用现有的MUI组件，并遵循 `ThemeProvider.tsx` 中定义的规范。交互模式应与应用内现有功能保持一致。

#### **3.4 结果审阅流程 (Result Review Flow)**
用户触发AI优化后，系统将弹出一个审阅视图。该视图将利用现有的 `DiffHighlighter.tsx` 组件，清晰地展示所有被修改字幕的“优化前”与“优化后”对比。用户可以通过“全部应用”按钮接受所有更改，或通过“取消”按钮放弃所有更改。
---
### **4. 技术约束与集成需求**

#### **4.1 现有技术栈**
新功能必须在以下现有技术栈的基础上进行开发：
* **语言**: Python, TypeScript
* **框架**: FastAPI (后端), React, Tauri (前端/桌面)
* **核心库**: MUI, Zustand (前端)
* **外部依赖**: DaVinci Resolve Scripting API

#### **4.2 集成方法**
* **API集成**:
    1.  前端将新增一个服务调用后端的AI优化API。
    2.  后端将新增一个模块，负责与用户配置的OpenAI兼容API进行通信。
* **前端集成**:
    1.  将在 `src/components/` 目录下创建一个新的React组件 `AIOptimizer.tsx`，并将其添加到 `OptimizerSidebar.tsx`。
    2.  将创建一个新的 `ReviewModal.tsx` 组件用于结果审阅。
    3.  将在Zustand状态管理中增加新的状态，用于管理API密钥、优化结果和处理状态。
* **缓存集成**: 后端将实现一个新的缓存模块。初期可使用内存缓存（如 `functools.lru_cache`）。

#### **4.3 代码组织与标准**
* **文件结构**:
    * 后端新逻辑应在 `backend/` 目录下创建一个新文件，如 `llm_optimizer.py`。
    * 新的API端点应在 `backend/routers/` 目录下创建一个新路由文件，如 `optimizer.py`。
* **编码标准**: 新增的Python和TypeScript代码必须遵循现有代码库中的命名约定和编码风格（例如，Python的snake_case，React组件的PascalCase）。

#### **4.4 部署与运维**
此功能将通过现有的Tauri构建流程 (`npm run tauri build`) 进行打包和分发，无需更改部署策略。

#### **4.5 风险评估与缓解策略**
* **技术风险**:
    1.  **外部API依赖**: 外部LLM服务的延迟、速率限制或停机可能会影响功能可用性。
        * **缓解**: 实现健壮的API客户端，包含超时和重试逻辑；通过缓存机制（FR5）减少不必要的API调用。
    2.  **结果对齐复杂性**: `SubtitleAligner` (FR6) 的逻辑可能很复杂。
        * **缓解**: 设计明确的系统提示词（FR4），强制要求LLM以结构化方式返回数据；开发强大的单元测试覆盖边缘情况。
* **成本风险**:
    1.  **API调用成本**: 大量优化请求可能导致高昂的API费用。
        * **缓解**: 强制执行缓存机制（FR5）；在UI上向用户明确展示待处理的字幕数量并进行操作确认。
* **安全风险**:
    1.  **API密钥泄露**: 用户API密钥若存储不当，可能存在安全风险。
        * **缓解**: 密钥将仅存储在用户本地设备的应用安全存储区。

---
### **5. 史诗与用户故事**

#### **史诗 1: AI 字幕优化功能**
* **史诗目标**: 本史诗旨在集成一个外部大语言模型（LLM），为用户提供一个强大、一键式的字幕优化功能。它将覆盖从用户配置、API通信到结果对齐和用户确认的完整工作流程，确保提供无缝且高效的编辑体验。

---
#### **用户故事**

**故事 1.1: 后端 - 核心API与缓存设置**
> **作为一名** 开发者,
> **我想要** 一个健壮的后端服务来处理AI优化请求，管理缓存并与外部LLM通信,
> **以便** 为前端提供稳定可靠的功能基础。

* **验收标准**:
    1.  创建一个新的FastAPI路由 `POST /api/v1/optimizer/optimize`，能接收字幕列表和可选的参考信息。
    2.  实现字幕的分批处理 (FR2) 和并行处理 (FR3)。
    3.  根据 `2.4 提示词工程指南` 构建正确的JSON输入和系统提示词 (FR4, FR9)。
    4.  实现对用户配置的外部LLM API的调用。
    5.  实现内存缓存机制 (FR5)。
    6.  对外部API调用有完整的错误处理，并能向前端返回明确的错误信息 (NFR2)。

**故事 1.2: 后端 - 结果对齐逻辑**
> **作为一名** 用户,
> **我希望** AI优化后的文本能与我原始的字幕完美对齐,
> **以便** 确保没有任何时间码或字幕条目丢失或错乱。

* **验收标准**:
    1.  创建一个 `SubtitleAligner` 组件 (FR6)。
    2.  该组件能准确地将优化后的文本与原始字幕的ID和时间码重新组合。
    3.  如果AI返回的字幕行数与输入不匹配，流程将优雅失败并报告错误。
    4.  成功对齐后输出一个结构完整的字幕列表。

**故事 1.3: 前端 - API配置界面**
> **作为一名** 用户,
> **我想要** 一个设置界面来配置我的AI服务API密钥和端点地址,
> **以便** 应用能够连接到我选择的服务。

* **验收标准**:
    1.  在UI中增加一个新的设置入口，并弹出一个设置模态窗口。
    2.  窗口包含“API端点URL”和“API密钥”（密码类型）的输入框。
    3.  “保存”按钮能将信息安全地存储在用户本地 (NFR1)。
    4.  “测试连接”按钮能验证凭据的有效性并提供反馈。

**故事 1.4: 前端 - 优化触发界面**
> **作为一名** 用户,
> **我想要** 在主界面上方便地启动AI优化并提供可选的上下文信息,
> **以便** 轻松地开始优化流程。

* **验收标准**:
    1.  在 `OptimizerSidebar.tsx` 中增加“AI字幕优化”区域。
    2.  该区域包含一个“AI优化字幕”按钮 和一个可选的“参考信息”文本框 (FR8)。
    3.  点击按钮时，数据被发送到后端，且UI进入加载状态 (NFR2)。

**故事 1.5: 前端 - 结果审阅与应用**
> **作为一名** 用户,
> **我想要** 在应用AI的修改前审阅所有变更,
> **以便** 我能完全控制最终的字幕内容。

* **验收标准**:
    1.  优化成功后，弹出一个“结果审阅”模态窗口。
    2.  窗口中只显示被修改过的字幕。
    3.  使用 `DiffHighlighter.tsx` 组件高亮展示差异。
    4.  提供“全部应用”和“取消”按钮，功能符合预期。
    5.  如果后端返回错误，则显示错误通知 (NFR2)。