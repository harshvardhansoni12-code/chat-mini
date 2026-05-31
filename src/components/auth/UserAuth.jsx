"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { signIn } from "next-auth/react";

export const UserAuth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        // Log in flow
        const result = await signIn("credentials", {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError("Invalid email or password.");
        } else {
          // Success! Redirect to home page or refresh session
          window.location.reload();
        }
      } else {
        // Sign up flow
        const res = await fetch("/api/user/v1/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullname,
            email,
            password,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message || "Registration failed.");
        } else {
          // Registration successful, automatically log in
          const result = await signIn("credentials", {
            redirect: false,
            email,
            password,
          });

          if (result?.error) {
            setError("Account created, but automatic sign-in failed. Please login manually.");
            setIsLogin(true);
          } else {
            window.location.reload();
          }
        }
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <Card className="shadow-lg border-neutral-200">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? "Welcome Back" : "Create Account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                {error}
              </div>
            )}
            
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-neutral-700">Full Name</label>
                <Input
                  required
                  placeholder="John Doe"
                  value={fullname}
                  onChange={(e) => setFullname(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700">Email Address</label>
              <Input
                required
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-neutral-700">Password</label>
              <Input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full mt-4" disabled={loading}>
              {loading ? "Please wait..." : isLogin ? "Sign In" : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-neutral-100 py-4">
          <p className="text-sm text-neutral-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              className="text-primary hover:underline font-medium transition-colors"
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
              }}
              disabled={loading}
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
