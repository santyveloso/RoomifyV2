import { getProviders, signIn, ClientSafeProvider } from "next-auth/react";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { GetServerSidePropsContext } from "next";
import "../styles/globals.css";

interface SignInProps {
  providers: Record<string, ClientSafeProvider> | null;
}

export default function SignIn({ providers }: SignInProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      
      console.log("Sign in result:", result);
      
      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        // Redirect to home page
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Sign in error:", err);
      setError("An error occurred during sign in");
    }
  };

  if (!providers) {
    return (
      <div>
        <h1>Sign in</h1>
        <p>Error loading authentication providers.</p>
        <Link href="/">Go back to home</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Sign in</h1>
      
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p style={{ color: "red" }}>{error}</p>}
        
        <button type="submit">Sign in</button>
      </form>
      
      <div style={{ marginTop: "20px" }}>
        <Link href="/auth/signup">Don&#39;t have an account? Sign up</Link>
      </div>
    </div>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  try {
    const providers = await getProviders();
    console.log("Fetched providers:", providers);
    return {
      props: { providers: providers || null },
    }
  } catch (error) {
    console.error("Error fetching providers:", error);
    return {
      props: { providers: null },
    }
  }
}
