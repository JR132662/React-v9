import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FaGithub, FaGoogle } from "react-icons/fa"
import { SignInFlow } from "../types"
import { Eye, EyeOff, TriangleAlert } from "lucide-react";

interface SignInCardProps {
    setState: (state: SignInFlow ) => void
}

export const SignInCard = ({ setState}: SignInCardProps) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const { signIn } = useAuthActions();
    const [ pending , setPending ] = useState(false);
    const [ error, setError] = useState<string | null>(null);

    const handleProviderSignIn = (value: "github"| "google") => {
        setPending(true);
        signIn(value)
        .finally(() => setPending(false));
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setPending(true);
        signIn("password", { email, password, flow: "signIn" })
        .catch(() => {
            setError("Invalid email or password");
        })
        .finally(() => 
            setPending(false));
    }

    return (
        <Card className="w-full h-full p-8">
            <CardHeader className="px-0 py-0">
                <CardTitle className="text-2xl font-bold mb-2">
                Login to Spirit Realm
                <CardDescription className="px-0 py-0">
                    Use your email and password to sign in.
                </CardDescription>
                </CardTitle>
                {error && 
                <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-1 animate-pulse">
                    <TriangleAlert className="size-4" />
                    <p>{error}</p>
                </div>}
            </CardHeader>
            <CardContent className="space-y-5 px-0 py-0">
                <form className="space-y-2.5" onSubmit={handleSubmit}>
                    <Input
                    disabled={pending}
                    value={email}
                    type="email" 
                    placeholder="Email" 
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full"
                    required
                     />
                    <div className="relative">
                        <Input
                        disabled={pending}
                        value={password}
                        type={showPassword ? "text" : "password"}
                        onChange={(e) => setPassword(e.target.value)}
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
                    <button
                    type="submit"
                    disabled={pending}
                    className="w-full relative bg-black text-white py-3 rounded-md hover:bg-black/90 transition-colors before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-purple-500/80 before:opacity-100 before:animate-pulse before:[animation-duration:1.6s]"
                    >
                    Sign In
                    </button>
                </form>
                <Separator className="my-4" />
                <div className="space-y-2.5">
                    <Button type="button"
                    disabled={pending}
                    variant="outline"
                    onClick={() => handleProviderSignIn("google")}
                    className="w-full relative">
                        <span className="absolute left-3 inline-flex items-center" aria-hidden="true">
                            <FaGoogle className="size-4" />
                        </span>
                        <span>Continue with Google</span>
                    </Button>
                    <Button type="button"
                     variant="outline"
                     disabled={pending}
                     onClick={() => handleProviderSignIn("github")} 
                     className="w-full relative">
                        <span className="absolute left-3 inline-flex items-center" aria-hidden="true">
                            <FaGithub className="size-4" />
                        </span>
                        <span>Continue with Github</span>
                    </Button>
                </div>
                <div className="text-md text-center text-gray-500">
                    <p>
                        Don't have an account?{" "}
                        <button
                            type="button"
                            onClick={() => setState("SignUp")}
                            className="text-purple-500 hover:underline"
                        >
                            Sign Up
                        </button>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}