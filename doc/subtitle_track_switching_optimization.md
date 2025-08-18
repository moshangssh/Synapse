# 字幕编辑器多轨道切换与编辑状态管理优化方案

## 1. 项目背景与问题描述

当前字幕编辑器在多轨道切换时存在编辑状态丢失的问题。当用户在一个字幕轨道上进行修改后，一旦切换到其他轨道，之前的所有修改都会丢失。这严重影响了用户体验，尤其是在需要频繁在不同轨道间切换进行编辑的场景下。

### 核心需求
- **独立的会话内编辑状态**: 为每一个字幕轨道在当前用户会话中维护一个独立的编辑状态（“草稿状态”）。
- **无损的轨道切换**: 在轨道切换时，完整保留当前轨道的编辑状态，并在返回时恢复。
- **无缝的编辑恢复**: 用户切回之前编辑过的轨道时，能够立即看到所有之前的修改和DIFF高亮。
- **目标明确的重置功能**: 提供重置当前轨道编辑状态的功能，且不影响其他轨道。

## 2. 设计方案概述

本方案旨在通过扩展 `useDataStore` 状态管理库，为每个字幕轨道维护独立的“草稿状态”，并优化轨道切换逻辑，实现无缝、无损的多轨道切换体验。

### 核心设计
1. **数据结构扩展**: 在 `useDataStore` 中添加 `trackDrafts` 对象，用于存储每个轨道的草稿状态。
2. **状态管理方法**: 实现 `saveTrackDraft`, `loadTrackDraft`, `resetCurrentTrackDraft` 等方法。
3. **逻辑流程优化**: 修改轨道切换和数据加载逻辑，确保状态的正确保存与恢复。
4. **UI 集成**: 在界面上添加“重置当前字幕”按钮，方便用户操作。

## 3. 详细实施方案

### 3.1 数据结构设计

#### `trackDrafts`
- **类型**: `Record<number, Subtitle[]>`
- **说明**: 键为轨道索引，值为该轨道的字幕数组（包含所有用户修改）。
- **示例**: `{ 1: [...], 2: [...] }`

### 3.2 核心方法实现

#### `saveTrackDraft(trackIndex: number, subtitles: Subtitle[])`
- **作用**: 保存指定轨道的当前编辑状态到 `trackDrafts`。
- **参数**: 
  - `trackIndex`: 轨道索引。
  - `subtitles`: 当前轨道的字幕数组（包含所有用户修改）。
- **逻辑**: 将 `subtitles` 数组深拷贝后存入 `trackDrafts[trackIndex]`。

#### `loadTrackDraft(trackIndex: number): Subtitle[] | undefined`
- **作用**: 从 `trackDrafts` 中加载指定轨道的草稿状态。
- **参数**: `trackIndex`: 轨道索引。
- **返回值**: 如果存在草稿，则返回该轨道的字幕数组；否则返回 `undefined`。
- **逻辑**: 直接返回 `trackDrafts[trackIndex]` 的深拷贝。

#### `resetCurrentTrackDraft(activeTrackIndex: number | null)`
- **作用**: 重置当前激活轨道的草稿状态。
- **参数**: `activeTrackIndex`: 当前激活的轨道索引。
- **逻辑**:
  1. 如果 `activeTrackIndex` 为 `null`，则直接返回。
  2. 从 `trackDrafts` 中删除该轨道的条目。
  3. 注意：重新加载数据的逻辑应由调用者负责。

### 3.3 轨道切换逻辑优化

#### 保存当前轨道状态
- **位置**: [`frontend/synapse/src/components/layout/MainLayout.tsx`](file:///C:/Users/qmzpgh/Desktop/Synapse/frontend/synapse/src/components/layout/MainLayout.tsx)
- **实现**: 在 `useEffect` 钩子中，当 `activeTrackIndex` 即将改变时，调用 `useDataStore.getState().saveTrackDraft(prevActiveTrackIndex, subtitles)` 保存当前轨道的草稿状态。

#### 恢复新轨道状态
- **位置**: [`frontend/synapse/src/components/layout/MainLayout.tsx`](file:///C:/Users/qmzpgh/Desktop/Synapse/frontend/synapse/src/components/layout/MainLayout.tsx)
- **实现**: 修改 `fetchSubtitles` 函数，在获取到后端数据后：
  1. 调用 `useDataStore.getState().loadTrackDraft(trackIndex)` 尝试加载新轨道的草稿状态。
  2. 如果 `loadTrackDraft` 返回了数据，则使用这些数据更新 `subtitles` 状态。
  3. 否则，使用从后端获取的原始数据。

### 3.4 UI 集成

#### 添加“重置当前字幕”按钮
- **位置**: [`frontend/synapse/src/components/layout/FileExplorer.tsx`](file:///C:/Users/qmzpgh/Desktop/Synapse/frontend/synapse/src/components/layout/FileExplorer.tsx)
- **实现**:
  1. 在文件浏览器的标题栏添加一个“重置当前字幕”按钮。
  2. 按钮点击事件处理函数：
     - 调用 `useDataStore.getState().resetCurrentTrackDraft(activeTrackIndex)` 清除当前轨道的草稿状态。
     - 重新从后端加载当前轨道的数据（对于导入文件，则重新加载原始数据）。

## 4. 测试验证方案

### 4.1 功能测试

#### 轨道切换时的状态保存和恢复
1. 在轨道A上进行一些修改。
2. 切换到轨道B。
3. 切换回轨道A，验证之前的修改是否被恢复。

#### 重置当前轨道功能
1. 在轨道A上进行一些修改。
2. 点击“重置当前字幕”按钮。
3. 验证轨道A的修改是否被清除，并恢复为原始状态。

#### 导入文件的重置功能
1. 导入一个SRT文件并进行一些修改。
2. 点击“重置当前字幕”按钮。
3. 验证导入文件的修改是否被清除，并恢复为原始状态。

### 4.2 边界情况测试

1. **无选中项时的重置按钮**: 启动应用，不选择任何轨道或文件，验证“重置当前字幕”按钮是否禁用。
2. **单个轨道**: 确保项目中只有一个字幕轨道，验证功能是否正常。
3. **网络错误**: 在获取字幕数据时模拟网络错误，验证应用是否正确处理。

### 4.3 自动化测试建议

1. **单元测试**: 为 `useDataStore` 中的核心方法编写单元测试。
2. **集成测试**: 为 [`FileExplorer.tsx`](file:///C:/Users/qmzpgh/Desktop/Synapse/frontend/synapse/src/components/layout/FileExplorer.tsx) 和 [`MainLayout.tsx`](file:///C:/Users/qmzpgh/Desktop/Synapse/frontend/synapse/src/components/layout/MainLayout.tsx) 编写集成测试，验证UI交互和状态管理的正确性。

## 5. 总结

本方案通过扩展状态管理和优化逻辑流程，有效解决了字幕编辑器多轨道切换时编辑状态丢失的问题。实施方案具有良好的可操作性和可维护性，完全兼容项目现有的技术栈，将显著提升用户体验。