import { getSession } from "next-auth/react";
import { PrismaClient } from "@prisma/client";
import { useState } from "react";
import { useRouter } from "next/router";

const prisma = new PrismaClient();

export default function Chores({ house, chores }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await fetch(`/api/houses/${house.id}/chores`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title, description }),
    });

    if (res.ok) {
      router.replace(router.asPath);
    }
  };

  return (
    <>
      <h1>Chores for {house.name}</h1>
      <h2>Add a new chore</h2>
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
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <button type="submit">Add chore</button>
      </form>
      <h2>All chores</h2>
      <ul>
        {chores.map((chore) => (
          <li key={chore.id}>
            <h3>{chore.title}</h3>
            <p>{chore.description}</p>
            <h4>Assignments</h4>
            <ul>
              {chore.assignments.map((assignment) => (
                <li key={assignment.id}>
                  {assignment.user.name} - {assignment.dueDate}
                </li>
              ))}
            </ul>
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

  const chores = await prisma.chore.findMany({
    where: { houseId: String(id) },
    include: { assignments: { include: { user: true } } },
  });

  return {
    props: { house, chores: JSON.parse(JSON.stringify(chores)) },
  };
}
