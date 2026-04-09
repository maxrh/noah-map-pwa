"use client";

import { useEffect, useState } from "react";

import { PageWrapper } from "@/components/layout/page-wrapper";

const SHEET_ID = "13BI2EJSYTXIuffiyNyslXV1VyFrpUQMe3Q-ONjOEAzo";
const API_KEY = "AIzaSyBEIsBvTuy7b7RysY5_lTiXAYJu4Z3PXWU";
const SHEET_URL = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Ark1!A1:G100?key=${API_KEY}`;

interface Group {
  name: string;
  description: string;
  address: string;
  image: string;
  category: string;
  link: string;
  location: string;
}

function parseGroups(values: string[][]): Group[] {
  const [, ...rows] = values;
  return rows.map((row) => ({
    name: row[0] ?? "",
    description: row[1] ?? "",
    address: row[2] ?? "",
    image: row[3] ?? "",
    category: row[4] ?? "",
    link: row[5] ?? "",
    location: row[6] ?? "",
  }));
}

export default function TestPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(SHEET_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((data) => setGroups(parseGroups(data.values)))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;

  return (
    <PageWrapper maxWidth="4xl">
      <h1 className="text-2xl font-bold mb-4">
        Google Sheets API Test
      </h1>
      <p className="mb-4 text-muted-foreground">
        Fetched {groups.length} groups from Google Sheets
      </p>

      <h2 className="text-lg font-semibold mb-2">Raw JSON:</h2>
      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm mb-6">
        {JSON.stringify(groups, null, 2)}
      </pre>

      <h2 className="text-lg font-semibold mb-2">Rendered:</h2>
      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.name} className="border rounded-lg p-4">
            <h3 className="font-bold">{group.name}</h3>
            <p className="text-sm text-muted-foreground">{group.category}</p>
            <p className="text-sm mt-1">{group.description}</p>
            <p className="text-sm mt-1">📍 {group.address}</p>
            <p className="text-sm mt-1">🗺️ {group.location}</p>
            {group.link && (
              <a
                href={group.link}
                className="text-sm text-blue-600 underline mt-1 block"
                target="_blank"
                rel="noopener noreferrer"
              >
                {group.link}
              </a>
            )}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
