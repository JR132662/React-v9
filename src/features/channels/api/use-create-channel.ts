import { useMutation } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type RequestType = {
  workspaceId: Id<"workspaces">;
  name: string;
};

type ResponseType = {
  channelId: Id<"channels">;
};

type Options = {
  onSuccess?: (data: ResponseType) => void;
  onError?: (error: Error) => void;
  onSettled?: () => void;
};

export const useCreateChannel = () => {
  const [data, setData] = useState<ResponseType | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  const mutation = useMutation(api.channels.create);

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

  return { mutate, data, error, isPending, isSuccess, isError, isSettled };
};