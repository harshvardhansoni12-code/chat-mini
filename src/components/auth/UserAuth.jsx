"use client";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
export const UserAuth = () => {
  const [state, setState] = useState(true);
  return (
    <div>
      <Card className="w-125">
        <CardHeader>
          <CardTitle>Please Login to continue</CardTitle>
        </CardHeader>
        <CardContent className="p-1.5">
          <Input placeholder="enter your name" />
          <Input placeholder="enter your email" />
          <Input placeholder="enter your password" />
        </CardContent>
        <CardFooter>
          <p>
            Already have an account?{" "}
            <span
              className="hover:underline"
              onClick={() => {
                setState((e) => !e);
              }}
            >
              {state ? "signup" : "login"}
            </span>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
