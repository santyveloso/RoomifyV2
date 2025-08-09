import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/router";

const prisma = new PrismaClient();

export default function Expenses({ house, expenses }) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState(null);
  const router = useRouter();

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let receiptUrl = null;

    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/expenses/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const { url } = await res.json();
        receiptUrl = url;
      }
    }

    const res = await fetch(`/api/houses/${house.id}/expenses`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, amount: parseFloat(amount), receiptUrl }),
    });

    if (res.ok) {
      router.replace(router.asPath);
    }
  };

  return (
    <>
      <h1>Expenses for {house.name}</h1>
      <h2>Add a new expense</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">Title</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="amount">Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="file">Receipt</label>
          <input type="file" id="file" onChange={handleFileChange} />
        </div>
        <button type="submit">Add expense</button>
      </form>
      <h2>All expenses</h2>
      <ul>
        {expenses.map((expense) => (
          <li key={expense.id}>
            {expense.title}: {expense.amount} {expense.currency} (created by{" "}
            {expense.creator.name})
            {expense.receiptUrl && (
              <a href={expense.receiptUrl} target="_blank" rel="noreferrer">
                View receipt
              </a>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}

export async function getServerSideProps(context) {
  const session = await getSession(context);
  const { id } = context.params;

  const house = await prisma.house.findUnique({
    where: { id: String(id) },
    include: { memberships: true },
  });

  if (!house) {
    return {
      notFound: true,
    };
  }

  const isMember = house.memberships.some(
    (membership) => membership.userId === session.user.id
  );

  if (!isMember) {
    return {
      redirect: {
        destination: "/auth/signin",
        permanent: false,
      },
    };
  }

  const expenses = await prisma.expense.findMany({
    where: { houseId: String(id) },
    include: { creator: true, shares: { include: { user: true } } },
  });

  return {
    props: { house, expenses: JSON.parse(JSON.stringify(expenses)) },
  };
}