// client/src/pages/CertificatePage.jsx
import React, { useEffect, useState, useRef } from "react";
import { api } from "../api";

/**
 * CertificatePage
 * - Fetches user's certificates from /quiz/certificates/all (your current endpoint)
 * - Renders card list with thumbnail preview
 * - View opens modal with embedded PDF <iframe>, plus Download / Print
 */

function CertificateCard({ cert, onView }) {
  // Create a small filename-friendly label
  const label = cert.courseTitle || `Course ${cert.courseId || ""}`;
  const issued = cert.createdAt ? new Date(cert.createdAt) : null;

  return (
    <li className="border rounded-lg p-4 shadow-sm bg-white flex gap-4 items-start">
      <div className="w-36 h-48 bg-gray-50 rounded overflow-hidden flex-shrink-0">
        {/* thumbnail: embed a small pdf preview if pdfUrl exists, otherwise show icon */}
        {cert.pdfUrl ? (
          <iframe
            title={`thumb-${cert._id}`}
            src={cert.pdfUrl + "#view=fitH&zoom=50"}
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="mx-auto">
                <path d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="#9CA3AF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2v6h6" stroke="#D1D5DB" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div className="text-sm mt-2">No preview</div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-semibold">{label}</h3>
        <p className="text-sm text-gray-600 mt-1">
          Issued:{" "}
          {issued
            ? issued.toLocaleDateString() + " " + issued.toLocaleTimeString()
            : "—"}
        </p>
        {cert.score != null && (
          <p className="text-sm text-gray-700 mt-2">Score: <strong>{cert.score}%</strong></p>
        )}
        {cert.id && <p className="text-xs text-gray-400 mt-1">ID: {cert._id || cert.id}</p>}

        <div className="mt-4 flex gap-3">
          <button
            onClick={() => onView(cert)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
          >
            View
          </button>

          {cert.pdfUrl ? (
            <a
              href={cert.pdfUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="px-4 py-2 border rounded-md text-sm hover:bg-gray-50"
            >
              Download
            </a>
          ) : (
            <button disabled className="px-4 py-2 border rounded-md text-sm text-gray-400">
              No PDF
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function ViewerModal({ cert, onClose }) {
  const iframeRef = useRef(null);

  if (!cert) return null;

  const pdfUrl = cert.pdfUrl;
  const title = cert.courseTitle || `Certificate`;

  const handlePrint = () => {
    // Print the embedded PDF by opening a new tab with the pdf and calling print
    if (!pdfUrl) return;
    const w = window.open(pdfUrl, "_blank");
    // browsers may block immediate print; open and user can print; some browsers allow calling print after load
    setTimeout(() => {
      try {
        w?.print();
      } catch (e) {
        // ignore
      }
    }, 500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-gray-600">{cert.userName || cert.username || ""}</p>
          </div>
          <div className="flex items-center gap-2">
            {pdfUrl && (
              <>
                <a href={pdfUrl} className="text-sm px-3 py-2 border rounded" target="_blank" rel="noreferrer">
                  Open in new tab
                </a>
                <button onClick={handlePrint} className="text-sm px-3 py-2 border rounded">
                  Print
                </button>
                <a href={pdfUrl} download className="text-sm px-3 py-2 bg-green-600 text-white rounded">
                  Download
                </a>
              </>
            )}
            <button onClick={onClose} className="ml-2 px-3 py-2 rounded border">
              Close
            </button>
          </div>
        </div>

        <div className="p-2 h-[80vh] overflow-auto bg-gray-50">
          {pdfUrl ? (
            // embed with fit to width
            <iframe
              ref={iframeRef}
              src={pdfUrl + "#view=FitH"}
              title="Certificate"
              style={{ width: "100%", height: "100%", border: 0 }}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              No certificate PDF available for preview.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CertificatePage() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCert, setActiveCert] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const fetchCerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get("/quiz/certificates/all");
        // Accept either array or { certificates: [] } shapes
        const data = Array.isArray(res.data) ? res.data : res.data?.certificates || [];
        if (mounted) {
          // Normalize each cert (optional)
          const normalized = data.map((c) => ({
            _id: c._id || c.id,
            courseId: c.courseId || c.course || null,
            courseTitle: c.courseTitle || c.title || `Course ${c.courseId || ""}`,
            pdfUrl: c.pdfUrl || c.url || c.fileUrl || null,
            createdAt: c.createdAt || c.issuedAt || c.createdAt,
            score: c.score ?? c.percent ?? null,
            userName: c.userName || c.username || c.name || "",
            raw: c,
          }));
          setCerts(normalized);
        }
      } catch (err) {
        console.error("Failed to fetch certificates:", err);
        if (mounted) {
          setError(err.response?.data?.message || err.message || "Failed to load");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchCerts();
    return () => (mounted = false);
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">🎓 My Certificates</h1>

      {loading ? (
        <div className="text-gray-500">Loading certificates…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : certs.length === 0 ? (
        <div className="border rounded p-6 text-center">
          <p className="text-gray-600 mb-4">No certificates yet. Pass a quiz to earn one.</p>
          <a href="/courses" className="px-4 py-2 bg-blue-600 text-white rounded">Browse Courses</a>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4">
          {certs.map((c) => (
            <CertificateCard key={c._id} cert={c} onView={(cert) => setActiveCert(cert)} />
          ))}
        </ul>
      )}

      {/* Viewer modal */}
      {activeCert && (
        <ViewerModal cert={activeCert} onClose={() => setActiveCert(null)} />
      )}
    </div>
  );
}
