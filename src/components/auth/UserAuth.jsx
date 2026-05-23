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
export const UserAuth = () => {
  const [state, setState] = useState(true);
  return (
    <div>
      <Card className="w-125">
        <CardHeader>
          <CardTitle>
            Please{" "}
            <span
              className="hover:underline"
              onClick={() => {
                setState((e) => !e);
              }}
            >
              {state ? "signup" : "login"}
            </span>{" "}
            to continue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-1.5">
            <div>
              <Input placeholder="enter your name" />
            </div>
            <div>
              <Input placeholder="enter your email" />
            </div>
            <div>
              <Input placeholder="enter your password" />
            </div>
            <div>
              <Button>Sign Up</Button>
            </div>
          </div>
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
