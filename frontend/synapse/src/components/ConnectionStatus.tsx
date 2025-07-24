import React from 'react';
import { Chip } from '@mui/material';
import { styled } from '@mui/material/styles';

const StatusChip = styled(Chip)(({ theme }) => ({
  minWidth: '200px', 
  justifyContent: 'center',
  fontSize: '1rem',
  padding: theme.spacing(1.5),
}));


type Status = 'connected' | 'connecting' | 'error' | 'initial';

interface ConnectionStatusProps {
  status: Status;
  message: string;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ status, message }) => {
  const statusConfig = {
    connected: { label: '已连接', color: 'success' },
    connecting: { label: '连接中...', color: 'warning' },
    error: { label: `错误: ${message}`, color: 'error' },
    initial: { label: '等待连接...', color: 'default' },
  } as const;

  const { label, color } = statusConfig[status];

  return <StatusChip label={label} color={color} />;
};

export default ConnectionStatus;
