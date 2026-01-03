"use client"
import { SignInFlow } from "../types"
import { useState } from "react"
import { SignInCard } from "./signin-card"
import { SignUpCard } from "./signup-card"

export const AuthScreen = () => {
    const [state, setState] = useState<SignInFlow>("SignIn")
    
    return (
        <div className="h-full flex items-center justify-center bg-background">
            <div className="md:h-auto md:w-105">
                {state === "SignIn" ? <SignInCard setState={setState} /> : <SignUpCard setState={setState} />}
            </div>
        </div>
    )
}