// 测试前端和后端之间的通信
async function testReplaceAll() {
  try {
    const subtitles = [
      {
        id: 1,
        startTimecode: "00:00:01:00",
        endTimecode: "00:00:03:00",
        text: "Hello World Test",
        originalText: "Hello World Test",
        diffs: [],
        isModified: false
      },
      {
        id: 2,
        startTimecode: "00:00:03:00",
        endTimecode: "00:00:05:00",
        text: "Goodbye World Test",
        originalText: "Goodbye World Test",
        diffs: [],
        isModified: false
      }
    ];

    const response = await fetch('http://localhost:8000/api/v1/subtitles/replace-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subtitles: subtitles.map(sub => ({
          id: sub.id,
          startTimecode: sub.startTimecode,
          endTimecode: sub.endTimecode,
          text: sub.text
        })),
        searchQuery: "World",
        replaceQuery: "Earth"
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('替换结果:', result);
    return result.data;
  } catch (error) {
    console.error('测试失败:', error);
    throw error;
  }
}

// 运行测试
testReplaceAll().then(result => {
  console.log('测试完成，结果:', result);
}).catch(error => {
  console.error('测试出错:', error);
});