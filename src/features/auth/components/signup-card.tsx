import { useState, type FormEvent } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthActions } from "@convex-dev/auth/react";
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FaGithub, FaGoogle } from "react-icons/fa"
import { SignInFlow } from "../types"
import { Eye, EyeOff, TriangleAlert } from "lucide-react"

interface SignUpCardProps {
    setState: (state: SignInFlow) => void
}

export const SignUpCard = ({ setState }: SignUpCardProps) => {
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [ pending , setPending ] = useState(false);
    const [ error, setError] = useState<string | null>(null);
    const { signIn } = useAuthActions();

    const onPasswordSignUp = (e: FormEvent) => {
        e.preventDefault();
        setError(null);
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        setPending(true);
        signIn("password", { name, email, password, flow: "signUp" })
            .catch(() => {
                setError("Sign up failed, password must include at least 6 characters, one uppercase letter, and one number.");
            })
            .finally(() => setPending(false));
    }

    const handleProviderSignUp = (value: "github"| "google") => {
        setPending(true);
        signIn(value)
        .finally(() => setPending(false));
    }

    return (
        <Card className="w-full h-full p-8">
            <CardHeader className="px-0 py-0">
                <CardTitle className="text-2xl font-bold mb-2">
                    Create your account
                    <CardDescription className="px-0 py-0">
                        Use your email and password to sign up.
                    </CardDescription>
                </CardTitle>
                {error && 
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-1 animate-pulse">
                    <TriangleAlert className="size-4" />
                    <p>{error}</p>
                </div>}
            </CardHeader>
            <CardContent className="space-y-5 px-0 py-0">
                <form className="space-y-2.5" onSubmit={onPasswordSignUp}>
                    <Input
                        disabled={pending}
                        autoComplete="name"
                        value={name}
                        placeholder="Full Name"
                        onChange={(e) => {
                            setName(e.target.value);
                            setError(null);
                        }}
                        className="w-full"
                        required
                    />
                    <Input
                        disabled={pending}
                        type="email"
                        value={email}
                        placeholder="Email"
                        onChange={(e) => {
                            setEmail(e.target.value);
                            setError(null);
                        }}
                        className="w-full"
                        required
                    />
                    <div className="relative">
                        <Input
                            disabled={pending}
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError(null);
                            }}
                            placeholder="Password"
                            className="w-full pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            disabled={pending}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    <div className="relative">
                        <Input
                            disabled={pending}
                            type={showConfirmPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setError(null);
                            }}
                            placeholder="Confirm Password"
                            className="w-full pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword((prev) => !prev)}
                            disabled={pending}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                        >
                            {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-black text-white py-3 rounded-md hover:bg-black/90 transition-colors"
                        disabled={pending}
                    >
                        Sign Up
                    </Button>
                </form>

                <Separator className="my-4" />

                <div className="space-y-2.5">
                    <Button type="button" variant="outline" disabled={pending} onClick={() => handleProviderSignUp("google")} className="w-full relative">
                        <span className="absolute left-3 inline-flex items-center" aria-hidden="true">
                            <FaGoogle className="size-4" />
                        </span>
                        <span>Continue with Google</span>
                    </Button>
                    <Button type="button" variant="outline" disabled={pending} onClick={() => handleProviderSignUp("github")} className="w-full relative">
                        <span className="absolute left-3 inline-flex items-center" aria-hidden="true">
                            <FaGithub className="size-4" />
                        </span>
                        <span>Continue with GitHub</span>
                    </Button>
                </div>

                <div className="text-md text-center text-gray-500">
                    <p>
                        Already have an account?{" "}
                        <button
                            type="button"
                            onClick={() => setState("SignIn")}
                            className="text-purple-500 hover:underline"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}