"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConvexAuth } from "convex/react";

import { SignInFlow } from "@/features/auth/types";
import { SignInCard } from "@/features/auth/components/signin-card";
import { SignUpCard } from "@/features/auth/components/signup-card";

import useJoinWorkspace from "@/features/workspaces/api/use-join-workspace";

const JoinWorkspacePage = () => {
  // This route segment is named [workspaceId], but it contains the join code.
  const params = useParams<{ workspaceId: string }>();
  const joinCode = params.workspaceId;
  const router = useRouter();

  const [authState, setAuthState] = useState<SignInFlow>("SignUp");

  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

  const {
    mutate: joinWorkspace,
    data,
    error,
    isPending,
    isSuccess,
    isError,
  } = useJoinWorkspace();

  const hasTriggeredRef = useRef(false);

  // If auth flips back to signed-out (common right after logout), allow a future retry.
  useEffect(() => {
    if (!isAuthenticated) {
      hasTriggeredRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!joinCode) return;
    if (isAuthLoading) return;
    if (!isAuthenticated) return;
    if (hasTriggeredRef.current) return;
    hasTriggeredRef.current = true;

    void (async () => {
      try {
        await joinWorkspace({ joinCode });
      } catch {
        // If a stale auth state triggered an unauthenticated join attempt,
        // let the user sign in and retry without needing a hard refresh.
        hasTriggeredRef.current = false;
      }
    })();
  }, [isAuthenticated, isAuthLoading, joinWorkspace, joinCode]);

  useEffect(() => {
    if (!isSuccess || !data?._id) return;
    router.replace(`/workspaces/${data._id}`);
  }, [data?._id, isSuccess, router]);

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white/10">
              <User className="size-6 text-white" aria-hidden="true" />
            </div>
            <h1 className="text-white text-2xl font-semibold">Join a group</h1>
            <p className="mt-1 text-sm text-white/80">
              You&apos;ve been invited. Create an account or sign in to join.
            </p>

            <div className="mt-4 inline-flex flex-col items-center rounded-md bg-white/10 px-4 py-2">
              <span className="text-[11px] uppercase tracking-wide text-white/70">Invite code</span>
              <span className="mt-0.5 font-mono text-white">{joinCode}</span>
            </div>
          </div>

          <div>
            {authState === "SignIn" ? (
              <SignInCard setState={setAuthState} />
            ) : (
              <SignUpCard setState={setAuthState} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center px-6 py-10">
      {isError ? (
        <div className="flex w-full max-w-sm flex-col items-center gap-3 px-6 text-center">
          <p className="text-white text-sm">
            {error?.message ?? "Unable to join workspace."}
          </p>
          <Button variant="secondary" onClick={() => router.replace("/")}>Go home</Button>
        </div>
      ) : (
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-white/10">
            <User className="size-6 text-white" aria-hidden="true" />
          </div>
          <h1 className="text-white text-2xl font-semibold">Joining workspace</h1>
          <p className="mt-1 text-sm text-white/80">
            {isAuthLoading
              ? "Checking your account..."
              : isPending
                ? "Adding you to the workspace..."
                : "Just a moment..."}
          </p>

          <div className="mt-4 inline-flex flex-col items-center rounded-md bg-white/10 px-4 py-2">
            <span className="text-[11px] uppercase tracking-wide text-white/70">Invite code</span>
            <span className="mt-0.5 font-mono text-white">{joinCode}</span>
          </div>

          <div className="mt-6 flex justify-center">
            <Loader className="size-5 text-white animate-spin" />
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinWorkspacePage;
