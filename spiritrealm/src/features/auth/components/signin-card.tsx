import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SignInFlow } from "../types"

interface SignInCardProps {
    setState: (state: SignInFlow ) => void
}

export const SignInCard = ({ setState}: SignInCardProps) => {
    return (
        <Card className="w-full h-full p-8">
            <CardHeader className="px-0 py-0">
                <CardTitle className="text-2xl font-bold mb-2">
                Login to Spirit Realm
                <CardDescription className="px-0 py-0">
                    Use your email and password to sign in.
                </CardDescription>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 px-0 py-0">
                <form className="space-y-2.5">
                    <Input
                    disabled={false} 
                    type="email" 
                    placeholder="Email" 
                    onChange={() => {}}
                    className="w-full"
                    required
                     />
                    <Input
                    disabled={false}
                    type="password" 
                    onChange={() => {}}
                    placeholder="Password" 
                    className="w-full" 
                    required
                    />
                    <button
                    type="submit"
                    className="w-full bg-purple-600 text-white py-3 rounded-md hover:bg-purple-700 transition-colors"
                    >
                    Sign In
                    </button>
                </form>
                <Separator className="my-4" />
                <div className="text-md text-center text-gray-500">
                    <p>
                        Don't have an account? <a href="#" className="text-purple-600 hover:underline">Sign Up</a>
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}