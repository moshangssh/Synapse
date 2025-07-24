import { useSnackbar } from 'notistack';

const useNotifier = () => {
    const { enqueueSnackbar } = useSnackbar();

    const notify = {
        success: (message: string) => {
            enqueueSnackbar(message, { variant: 'success' });
        },
        error: (message: string) => {
            enqueueSnackbar(message, { variant: 'error' });
        },
        warning: (message: string) => {
            enqueueSnackbar(message, { variant: 'warning' });
        },
        info: (message: string) => {
            enqueueSnackbar(message, { variant: 'info' });
        },
    };

    return notify;
};

export default useNotifier;