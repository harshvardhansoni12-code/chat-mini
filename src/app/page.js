import { UserAuth } from "@/components/auth/UserAuth";
export default function Home() {
  return (
    <>
      <div className="flex items-center justify-center">
        <div>
          <UserAuth />
        </div>
      </div>
    </>
  );
}
