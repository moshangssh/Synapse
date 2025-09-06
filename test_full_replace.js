// 完整的替换功能测试
async function testFullReplaceProcess() {
  try {
    // 初始化字幕数据
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

    console.log('原始字幕:', subtitles);

    // 模拟 replaceAllSubtitles 函数
    async function replaceAllSubtitles(subtitles, searchQuery, replaceQuery) {
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
          searchQuery,
          replaceQuery
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.data;
    }

    // 调用替换服务
    const result = await replaceAllSubtitles(subtitles, "World", "Earth");
    console.log('替换结果:', result);

    // 验证结果
    if (result && result.length > 0) {
      console.log('替换成功!');
      result.forEach(item => {
        console.log(`ID ${item.id}: "${item.text}"`);
      });
    } else {
      console.log('没有找到匹配的字幕进行替换');
    }

    return result;
  } catch (error) {
    console.error('替换过程出错:', error);
    throw error;
  }
}

// 运行测试
testFullReplaceProcess().then(result => {
  console.log('完整测试完成，结果:', result);
}).catch(error => {
  console.error('测试出错:', error);
});