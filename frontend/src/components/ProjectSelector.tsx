import React, { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Project {
  id: number;
  name: string;
}

export default function ProjectSelector({ token }: { token: string }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function fetchProjects() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_URL}/projects/`, {
          credentials: "include", // Send cookies with request
        });
        if (!res.ok) throw new Error("Failed to fetch projects");
        setProjects(await res.json());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, [token]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // Send cookies with request
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const project = await res.json();
      setProjects([...projects, project]);
      setNewName("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSelect(projectId: number) {
    router.push(`/project/${projectId}`);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    router.replace("/");
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 bg-white rounded shadow relative">
      <Button
        onClick={handleLogout}
        variant="outline"
        size="sm"
        className="absolute top-4 right-4"
      >
        Logout
      </Button>
      <h2 className="text-2xl font-bold mb-4 text-center">Select a Project</h2>
      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
      <ul className="mb-4">
        {projects.map((p) => (
          <li key={p.id} className="mb-2 flex justify-between items-center">
            <span>{p.name}</span>
            <Button onClick={() => handleSelect(p.id)} size="sm">Open</Button>
          </li>
        ))}
      </ul>
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          placeholder="New project name"
          className="flex-1 px-3 py-2 border rounded"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          required
        />
        <Button type="submit" disabled={loading || !newName}>Create</Button>
      </form>
    </div>
  );
} 