import { getAssets } from "../utils/storage";
import { deleteAsset } from "../utils/storage";

function Dashboard({ assets, setAssets }) {
  

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
              <th>Actions</th>

            </tr>
          </thead>

          <tbody>
            {assets.map((asset) => (
              <tr key={asset.id}>
                <td>{asset.email}</td>
                <td>{asset.domain}</td>
                <td>{asset.githubOrg}</td>
                <td>
                  <button onClick={() => {
        deleteAsset(asset.id);

        setAssets(
          assets.filter(
            (a) => a.id !== asset.id
          )
        );
      }}
    >
      Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Dashboard;