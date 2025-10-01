// client/src/pages/CertificatePage.jsx
import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function CertificatePage() {
  const [certs, setCerts] = useState([]);

  useEffect(() => {
    const fetchCerts = async () => {
      try {
        const res = await api.get("/quiz/certificates/all");
        setCerts(res.data || []);
      } catch (err) {
        console.error("Failed to fetch certificates:", err.response?.data || err.message);
      }
    };
    fetchCerts();
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">🎓 My Certificates</h1>
      {certs.length === 0 ? (
        <p className="text-gray-500">No certificates yet. Pass a quiz to earn one.</p>
      ) : (
        <ul className="space-y-4">
          {certs.map((c) => (
            <li key={c._id} className="border p-4 rounded">
              <p>Course ID: {c.courseId}</p>
              <p>
                Issued: {new Date(c.createdAt).toLocaleDateString()}{" "}
                {new Date(c.createdAt).toLocaleTimeString()}
              </p>
              <a
                href={c.pdfUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 underline"
              >
                View Certificate
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
