# 测试工具使用指南

本文档说明了如何使用 `testUtils.ts` 中的测试工具来简化测试代码。

## 测试工具函数

### 1. `setupCommonTestMocks(subtitles: Subtitle[] = [])`
设置所有常用的测试mocks，包括：
- Tauri window API
- useDataStore
- 返回 `mockSetSubtitles` 函数用于断言

**示例：**
```typescript
const { mockSetSubtitles } = setupCommonTestMocks(mockInitialSubtitles);
```

### 2. `clearAllMocks()`
清除所有mocks的调用历史。

**示例：**
```typescript
beforeEach(() => {
  clearAllMocks();
});
```

### 3. `createMockSubtitles(count: number = 4)`
创建指定数量的测试字幕数据。

**示例：**
```typescript
const subtitles = createMockSubtitles(10); // 创建10个测试字幕
```

### 4. `createMockSetSubtitles()`
创建mock的 `setSubtitles` 函数。

**示例：**
```typescript
const mockSetSubtitles = createMockSetSubtitles();
```

### 5. `createMockDataStore(subtitles: Subtitle[], setSubtitles)`
创建mock的 useDataStore 实现。

**示例：**
```typescript
vi.mocked(useDataStore).mockImplementation(
  createMockDataStore(subtitles, mockSetSubtitles)
);
```

### 6. `mockTauriWindowApi()`
Mock Tauri window API（已包含在 `setupCommonTestMocks` 中）。

### 7. `mockFetchApi(responseData)`
Mock fetch API。

**示例：**
```typescript
mockFetchApi({
  status: 'success',
  data: mockData,
  frameRate: 24,
});
```

## 使用示例

### 基本测试结构
```typescript
describe('useFindReplace Hook', () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it('should handle search functionality', () => {
    // 1. 设置测试数据
    const mockSubtitles = [
      { id: 1, text: 'Hello world', ... },
      { id: 2, text: 'Test subtitle', ... },
    ];
    
    // 2. 设置mocks
    const { mockSetSubtitles } = setupCommonTestMocks(mockSubtitles);
    
    // 3. 执行测试
    const { result } = renderHook(() => useFindReplace());
    
    act(() => {
      result.current.handleSearchChange({ target: { value: 'test' } });
    });
    
    // 4. 断言
    expect(result.current.filteredSubtitles).toHaveLength(1);
  });
});
```

### 复杂测试场景
```typescript
it('should handle replace all functionality', () => {
  // 1. 创建测试数据
  const subtitles = createMockSubtitles(5);
  
  // 2. 设置mocks
  const mockSetSubtitles = createMockSetSubtitles();
  vi.mocked(useDataStore).mockImplementation(
    createMockDataStore(subtitles, mockSetSubtitles)
  );
  
  // 3. 执行操作
  const { result } = renderHook(() => useFindReplace());
  
  act(() => {
    result.current.handleSearchChange({ target: { value: 'Subtitle' } });
    result.current.handleReplaceChange({ target: { value: 'Replaced' } });
    result.current.handleReplaceAll();
  });
  
  // 4. 验证结果
  expect(mockSetSubtitles).toHaveBeenCalled();
  const updatedSubtitles = mockSetSubtitles.mock.calls[0][0];
  expect(updatedSubtitles.every(s => s.text.includes('Replaced'))).toBe(true);
});
```

## 优势

1. **代码复用**：避免在每个测试文件中重复设置mocks
2. **一致性**：确保所有测试使用相同的mock设置
3. **可维护性**：修改mock逻辑只需更新testUtils.ts
4. **简洁性**：测试代码更加清晰和专注于业务逻辑

## 迁移现有测试

要将现有测试迁移到使用测试工具：

1. 导入需要的工具函数
2. 移除重复的mock设置代码
3. 使用 `setupCommonTestMocks` 替换手动mock设置
4. 使用 `clearAllMocks` 在每个测试前清理
5. 使用其他工具函数简化测试数据创建

### 迁移前
```typescript
// 大量重复的mock代码...
vi.mock('@tauri-apps/api/window', () => ({ ... }));
vi.mock('../stores/useDataStore', () => ({ ... }));
const mockSetSubtitles = vi.fn();
const mockState = { ... };
```

### 迁移后
```typescript
// 简洁的一行代码
const { mockSetSubtitles } = setupCommonTestMocks(mockData);
```