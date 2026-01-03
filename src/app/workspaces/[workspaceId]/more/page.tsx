"use client";

import * as React from "react";
import { useMutation, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader, User, Phone, KeyRound, TriangleAlert } from "lucide-react";

const MorePage = () => {
  const { signIn } = useAuthActions();

  const user = useQuery(api.users.current);
  const settings = useQuery(api.userSettings.getMy);

  const updateName = useMutation(api.users.updateMyName);
  const updateSettings = useMutation(api.userSettings.updateMy);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Password reset/change flow
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetCode, setResetCode] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [resetPending, setResetPending] = React.useState(false);
  const [resetStep, setResetStep] = React.useState<"request" | "verify">("request");

  React.useEffect(() => {
    if (user === undefined || user === null) return;
    setName(String(user.name ?? "").trim());
    setResetEmail(String(user.email ?? "").trim());
  }, [user]);

  React.useEffect(() => {
    if (settings === undefined || settings === null) return;
    setPhone(String(settings.phone ?? "").trim());
  }, [settings]);

  const isLoading = user === undefined || settings === undefined;

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader className="size-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">You must be signed in.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-background px-4 py-3">
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          General settings for your account.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {error ? (
          <div className="mb-3 rounded-md bg-destructive/15 px-3 py-2 text-sm text-destructive flex items-center gap-2">
            <TriangleAlert className="size-4" />
            <span>{error}</span>
          </div>
        ) : null}

        <div className="grid gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="size-4 text-muted-foreground" />
                Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="account-email">Email</Label>
                <Input id="account-email" value={String(user.email ?? "")} disabled />
              </div>

              <div className="space-y-1">
                <Label htmlFor="account-name">Name</Label>
                <Input
                  id="account-name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="account-phone">Phone number</Label>
                <Input
                  id="account-phone"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setError(null);
                  }}
                  placeholder="(optional)"
                />
              </div>

              <Button
                type="button"
                className="w-full"
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  setError(null);
                  try {
                    await updateName({ name });
                    await updateSettings({ phone: phone.trim() ? phone.trim() : undefined });
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Failed to save settings");
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <KeyRound className="size-4 text-muted-foreground" />
                Password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                If you signed up with email + password, you can reset it here.
              </p>

              {resetStep === "request" ? (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      value={resetEmail}
                      onChange={(e) => {
                        setResetEmail(e.target.value);
                        setError(null);
                      }}
                      placeholder="you@example.com"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={resetPending || !resetEmail.trim()}
                    onClick={async () => {
                      setResetPending(true);
                      setError(null);
                      try {
                        await signIn("password", {
                          email: resetEmail.trim(),
                          flow: "reset",
                        });
                        setResetStep("verify");
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Failed to request password reset"
                        );
                      } finally {
                        setResetPending(false);
                      }
                    }}
                  >
                    {resetPending ? "Sending…" : "Send reset code"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="reset-code">Reset code</Label>
                    <Input
                      id="reset-code"
                      value={resetCode}
                      onChange={(e) => {
                        setResetCode(e.target.value);
                        setError(null);
                      }}
                      placeholder="Enter the code you received"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-password">New password</Label>
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(null);
                      }}
                      placeholder="New password"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      className="flex-1"
                      disabled={resetPending}
                      onClick={() => {
                        setResetStep("request");
                        setResetCode("");
                        setNewPassword("");
                        setError(null);
                      }}
                    >
                      Back
                    </Button>
                    <Button
                      type="button"
                      className="flex-1"
                      disabled={
                        resetPending ||
                        !resetEmail.trim() ||
                        !resetCode.trim() ||
                        !newPassword.trim()
                      }
                      onClick={async () => {
                        setResetPending(true);
                        setError(null);
                        try {
                          await signIn("password", {
                            email: resetEmail.trim(),
                            code: resetCode.trim(),
                            password: newPassword,
                            flow: "reset-verification",
                          });
                          setResetStep("request");
                          setResetCode("");
                          setNewPassword("");
                        } catch (e) {
                          setError(
                            e instanceof Error
                              ? e.message
                              : "Failed to change password"
                          );
                        } finally {
                          setResetPending(false);
                        }
                      }}
                    >
                      {resetPending ? "Updating…" : "Change password"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default MorePage;
