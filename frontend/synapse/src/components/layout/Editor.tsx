import { 
  Box, 
  Tab, 
  Tabs, 
  IconButton, 
  Typography,
  Paper
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useState } from 'react';

interface EditorTab {
  id: string;
  name: string;
  content: string;
  isDirty: boolean;
}

interface EditorProps {
  onCloseFile: (fileName: string) => void;
}

export function Editor({ onCloseFile }: EditorProps) {
  const [tabs, setTabs] = useState<EditorTab[]>([
    {
      id: 'App.tsx',
      name: 'App.tsx',
      isDirty: false,
      content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to VSCode Clone</h1>
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
      </header>
    </div>
  );
}

export default App;`
    }
  ]);

  const [activeTabId, setActiveTabId] = useState('App.tsx');

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  const closeTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    onCloseFile(tabId);
    
    if (activeTabId === tabId && tabs.length > 1) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTabId(remainingTabs[0].id);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: string) => {
    setActiveTabId(newValue);
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1e1e1e',
        height: '100%',
      }}
    >
      {/* Tab Bar */}
      <Paper
        sx={{
          backgroundColor: '#2d2d30',
          borderRadius: 0,
          borderBottom: '1px solid #3c3c3c',
          minHeight: 35,
        }}
      >
        <Tabs
          value={activeTabId}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons={false}
          sx={{
            minHeight: 35,
            '& .MuiTabs-indicator': {
              display: 'none',
            },
            '& .MuiTab-root': {
              minHeight: 35,
              paddingX: 2,
              paddingY: 1,
              fontSize: '0.75rem',
              textTransform: 'none',
              color: '#969696',
              backgroundColor: '#2d2d30',
              borderRight: '1px solid #3c3c3c',
              minWidth: 'auto',
              '&.Mui-selected': {
                backgroundColor: '#1e1e1e',
                color: '#ffffff',
              },
              '&:hover': {
                color: '#cccccc',
              },
            },
          }}
        >
          {tabs.map(tab => (
            <Tab
              key={tab.id}
              value={tab.id}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tab.name}</span>
                  {tab.isDirty && (
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        backgroundColor: '#ffffff',
                        borderRadius: '50%',
                      }}
                    />
                  )}
                  <IconButton
                    size="small"
                    onClick={(e) => closeTab(tab.id, e)}
                    sx={{
                      width: 16,
                      height: 16,
                      ml: 0.5,
                      color: 'inherit',
                      opacity: 0,
                      '.MuiTab-root:hover &': {
                        opacity: 1,
                      },
                      '&:hover': {
                        backgroundColor: '#3c3c3c',
                      },
                    }}
                  >
                    <Close sx={{ fontSize: 12 }} />
                  </IconButton>
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Editor Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {activeTab ? (
          <Box sx={{ height: '100%' }}>
            <Box
              component="pre"
              sx={{
                p: 2,
                color: '#d4d4d4',
                fontSize: '0.75rem',
                lineHeight: 1.5,
                height: '100%',
                overflow: 'auto',
                fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
                margin: 0,
              }}
            >
              <code>{activeTab.content}</code>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: '#969696',
            }}
          >
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ mb: 1 }}>
                Welcome
              </Typography>
              <Typography>
                Open a file to start editing
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}