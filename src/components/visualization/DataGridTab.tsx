import React from "react";
import { Box, Typography, Chip } from "@mui/material";
import { BatteryFull } from "@mui/icons-material";
import { DataGrid, GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { DataGridTabProps } from "../../types/NetworkVisualization.types";
import { formatValue } from "../../utils/networkUtils";

export function DataGridTab({ gridData }: DataGridTabProps) {
  const columns: GridColDef[] = [
    {
      field: "sensorId",
      headerName: "Sensor ID",
      width: 100,
      type: "number",
    },
    {
      field: "x",
      headerName: "X",
      width: 80,
      type: "number",
    },
    {
      field: "y",
      headerName: "Y",
      width: 80,
      type: "number",
    },
    {
      field: "energy",
      headerName: "Energy",
      width: 100,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BatteryFull
            sx={{
              fontSize: 16,
              color:
                params.row.energyPercentage > 50
                  ? "success.main"
                  : params.row.energyPercentage > 20
                  ? "warning.main"
                  : "error.main",
            }}
          />
          <Typography variant="body2">{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "energyPercentage",
      headerName: "Energy %",
      width: 100,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography
          variant="body2"
          sx={{
            color:
              params.value > 50
                ? "success.main"
                : params.value > 20
                ? "warning.main"
                : "error.main",
          }}
        >
          {params.value}%
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === "Active"
              ? "success"
              : params.value === "Sleeping"
              ? "default"
              : "error"
          }
          variant={params.value === "Sleeping" ? "outlined" : "filled"}
        />
      ),
    },
    {
      field: "clusterRole",
      headerName: "Cluster Role",
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value}
          size="small"
          color={
            params.value === "Cluster Head"
              ? "primary"
              : params.value.includes("Member")
              ? "secondary"
              : "default"
          }
          variant={params.value === "None" ? "outlined" : "filled"}
        />
      ),
    },
    {
      field: "clusterId",
      headerName: "Cluster ID",
      width: 100,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {params.value !== undefined ? params.value : "-"}
        </Typography>
      ),
    },
    {
      field: "memberCount",
      headerName: "Members",
      width: 100,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">
          {params.row.isClusterHead && params.value !== undefined
            ? `${params.value} (${params.row.sleepingMemberCount} sleeping)`
            : "-"}
        </Typography>
      ),
    },
    {
      field: "temperature",
      headerName: "Temp (°C)",
      width: 100,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{formatValue(params.value)}</Typography>
      ),
    },
    {
      field: "salinity",
      headerName: "Salinity (PSU)",
      width: 120,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{formatValue(params.value)}</Typography>
      ),
    },
    {
      field: "pressure",
      headerName: "Pressure (kPa)",
      width: 120,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{formatValue(params.value)}</Typography>
      ),
    },
    {
      field: "ph",
      headerName: "pH",
      width: 80,
      type: "number",
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2">{formatValue(params.value, 2)}</Typography>
      ),
    },
  ];

  return (
    <Box sx={{ height: 400, width: "100%" }}>
      <DataGrid
        rows={gridData}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 10 },
          },
          sorting: {
            sortModel: [{ field: "sensorId", sort: "asc" }],
          },
        }}
        pageSizeOptions={[10, 25, 50]}
        checkboxSelection={false}
        disableRowSelectionOnClick
        density="compact"
        sx={{
          "& .MuiDataGrid-cell": {
            fontSize: "0.875rem",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: "#f5f5f5",
            fontSize: "0.875rem",
            fontWeight: "bold",
          },
        }}
      />
    </Box>
  );
}
