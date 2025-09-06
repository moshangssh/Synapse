import { useCallback } from "react";
import { Box } from "@mui/material";
import SubtitleTable from "../components/SubtitleTable";

interface SubtitleEditorPageProps {
  jumpToSubtitleId: number | null;
  onRowClick: (id: number) => void;
}

export function SubtitleEditorPage({
  jumpToSubtitleId,
  onRowClick: onRowClickProp,
}: SubtitleEditorPageProps) {
  const onRowClick = useCallback(onRowClickProp, [onRowClickProp]);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SubtitleTable
        jumpToSubtitleId={jumpToSubtitleId}
        onRowClick={onRowClick}
      />
    </Box>
  );
}