import { getAssets } from "../utils/storage";

function Dashboard() {
  const assets = getAssets();

  return (
    <div>
      <h1>Dashboard</h1>

      {assets.length === 0 ? (
        <p>No assets found.</p>
      ) : (
        <table border="1">
          <thead>
            <tr>
              <th>Email</th>
              <th>Domain</th>
              <th>GitHub Org</th>
            </tr>
          </thead>

          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.email}</td>
                <td>{asset.domain}</td>
                <td>{asset.githubOrg}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;