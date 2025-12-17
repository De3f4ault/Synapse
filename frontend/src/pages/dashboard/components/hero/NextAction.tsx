/**
 * NextAction - Primary CTA for most important action
 */
export function NextAction() {
  return (
    <div className="p-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl">
      <h3 className="text-xl font-bold mb-2">12 Cards Due for Review</h3>
      <button className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold">
        Start Reviewing →
      </button>
    </div>
  );
}
