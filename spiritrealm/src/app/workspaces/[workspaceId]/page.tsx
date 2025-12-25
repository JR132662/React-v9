"use client";

import { useParams } from "next/navigation";

const WorkspaceIdPage = () => {
  const params = useParams();

  return (
    <div>
      <h1>Workspace ID : {params.workspaceId}</h1>
    </div>
  );
}

export default WorkspaceIdPage;