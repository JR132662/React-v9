import { useState } from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { FaApple, FaGoogle } from "react-icons/fa"
import { SignInFlow } from "../types"

interface SignUpCardProps {
    setState: (state: SignInFlow) => void
}

export const SignUpCard = ({ setState }: SignUpCardProps) => {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")

    return (
        <Card className="w-full h-full p-8">
            <CardHeader className="px-0 py-0">
                <CardTitle className="text-2xl font-bold mb-2">
                    Create your account
                    <CardDescription className="px-0 py-0">
                        Use your email and password to sign up.
                    </CardDescription>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-0 py-0">
                <form className="space-y-2.5">
                    <Input
                        disabled={false}
                        type="email"
                        value={email}
                        placeholder="Email"
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full"
                        required
                    />
                    <Input
                        disabled={false}
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full"
                        required
                    />
                    <Input
                        disabled={false}
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 transition-colors"
                    >
                        Sign Up
                    </button>
                </form>

                <Separator className="my-4" />

                {/* <div className="space-y-2.5">
                    <Button type="button" variant="outline" className="w-full relative">
                        <span className="absolute left-3 inline-flex items-center" aria-hidden="true">
                            <FaGoogle className="size-4" />
                        </span>
                        <span>Continue with Google</span>
                    </Button>
                    <Button type="button" variant="outline" className="w-full relative">
                        <span className="absolute left-3 inline-flex items-center" aria-hidden="true">
                            <FaApple className="size-4" />
                        </span>
                        <span>Continue with Facebook</span>
                    </Button>
                </div> */}

                <div className="text-md text-center text-gray-500">
                    <p>
                        Already have an account?{" "}
                        <button
                            type="button"
                            onClick={() => setState("SignIn")}
                            className="text-purple-600 hover:underline"
                        >
                            Sign In
                        </button>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}