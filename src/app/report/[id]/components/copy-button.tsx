"use client";

function CopyButton({ text }: { text: string }) {
  return (
    <button
      className="text-sm px-3 py-1 rounded border hover:bg-gray-50"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
      }}
    >
      Copy summary
    </button>
  );
}

export default CopyButton;
