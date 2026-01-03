import { useMutation } from "convex/react";
import { useCallback, useState } from "react";

import { api } from "../../../../convex/_generated/api";

interface UseJoinWorkspaceProps {
    joinCode: string;
}

export const useJoinWorkspace = () => {
    const mutation = useMutation(api.workspaces.join);
    type JoinWorkspaceResponse = Awaited<ReturnType<typeof mutation>>;

    const [data, setData] = useState<JoinWorkspaceResponse | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isError, setIsError] = useState(false);
    const [isSettled, setIsSettled] = useState(false);

    const mutate = useCallback(
        async (values: UseJoinWorkspaceProps) => {
            setIsPending(true);
            setIsSettled(false);
            setIsSuccess(false);
            setIsError(false);
            setError(null);

            try {
                const response = await mutation(values);
                setData(response);
                setIsSuccess(true);
                return response;
            } catch (err) {
                const e = err as Error;
                setData(null);
                setError(e);
                setIsError(true);
                throw e;
            } finally {
                setIsPending(false);
                setIsSettled(true);
            }
        },
        [mutation]
    );

    return {
        mutate,
        data,
        error,
        isPending,
        isSuccess,
        isError,
        isSettled,
    };
};

export default useJoinWorkspace;