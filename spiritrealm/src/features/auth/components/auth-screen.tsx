"use client"
import { SignInFlow } from "../types"
import { useState } from "react"
import { SignInCard } from "./signin-card"
import { SignUpCard } from "./signup-card copy"

export const AuthScreen = () => {
    const [state, setState] = useState<SignInFlow>("SignIn")
    
    return (
        <div className="h-full flex items-center justify-center bg-[#5C3B58]">
            <div className="md:h-auto md:w-[420px]">
                {state === "SignIn" ? <SignInCard setState={setState} /> : <SignUpCard setState={setState} />}
            </div>
        </div>
    )
}