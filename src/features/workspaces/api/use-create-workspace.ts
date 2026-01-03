import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../../convex/_generated/api";

type RequestType = {
  name: string;
};

type ResponseType = {
  workSpaceId: string;
  joinCode: string;
};

type Options = {
  onSuccess?: (data: ResponseType) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
};

export const useCreateWorkspace = () => {
  const [data, setData] = useState<ResponseType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  const mutation = useMutation(api.workspaces.create);

  const mutate = useCallback(
    async (values: RequestType, options?: Options) => {
      setIsPending(true);
      setIsSettled(false);
      setIsSuccess(false);
      setIsError(false);
      setError(null);

      try {
        const response = await mutation(values);
        setData(response);
        setIsSuccess(true);
        options?.onSuccess?.(response);
        return response;
      } catch (err) {
        const e = err as Error;
        setData(null);
        setError(e);
        setIsError(true);
        options?.onError?.(e);
        throw e;
      } finally {
        setIsPending(false);
        setIsSettled(true);
        options?.onSettled?.();
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