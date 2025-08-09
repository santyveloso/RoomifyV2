import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import "../../pages/styles/globals.css";

export default function CreateHouse() {
  const [name, setName] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/houses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    });

    if (res.ok) {
      const house = await res.json();
      router.push(`/house/${house.id}`);
    }
  };

  return (
    <>
      <h1>Create a new house</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <button type="submit">Create house</button>
      </form>
      <Link href="/">Back to Dashboard</Link>
    </>
  );
}
