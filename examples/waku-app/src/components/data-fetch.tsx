// Server Component - demonstrates async data fetching

interface DataItem {
  id: number;
  title: string;
  value: number;
}

const fetchMockData = async (): Promise<DataItem[]> => {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Mock data that would typically come from a database or API
  return [
    { id: 1, title: 'Active Users', value: 1234 },
    { id: 2, title: 'Page Views', value: 5678 },
    { id: 3, title: 'Revenue', value: 9012 },
  ];
};

export const DataFetch = async () => {
  const data = await fetchMockData();

  return (
    <section className="border-cyan-400 -mx-4 mt-4 rounded-sm border border-dashed p-4 bg-cyan-50">
      <h3 className="text-sm font-bold mb-2">
        Server Component: Data Fetch
      </h3>
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.id} className="flex justify-between items-center">
            <span className="text-sm text-gray-700">{item.title}:</span>
            <span className="font-bold text-lg">{item.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-gray-500">
        ℹ️ Data fetched on server, no fetch code sent to client.
      </p>
    </section>
  );
};
