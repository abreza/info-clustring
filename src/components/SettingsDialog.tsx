import React from "react";
import {
  Box,
  Button,
  Typography,
  Slider,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { SimulationConfig } from "../service/types";

interface SettingsDialogProps {
  open: boolean;
  config: SimulationConfig;
  onClose: () => void;
  onConfigChange: (config: SimulationConfig) => void;
}

export function SettingsDialog({
  open,
  config,
  onClose,
  onConfigChange,
}: SettingsDialogProps) {
  const updateConfig = (updates: Partial<SimulationConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Simulation Configuration</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 2 }}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Network Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Number of Sensors: {config.numSensors}
                  </Typography>
                  <Slider
                    value={config.numSensors}
                    onChange={(_, value) =>
                      updateConfig({ numSensors: value as number })
                    }
                    min={10}
                    max={500}
                    step={10}
                    marks={[
                      { value: 50, label: "50" },
                      { value: 100, label: "100" },
                      { value: 200, label: "200" },
                      { value: 300, label: "300" },
                    ]}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Initial Energy: {config.initialEnergy}
                  </Typography>
                  <Slider
                    value={config.initialEnergy}
                    onChange={(_, value) =>
                      updateConfig({ initialEnergy: value as number })
                    }
                    min={50}
                    max={200}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Network Width: {config.width}
                  </Typography>
                  <Slider
                    value={config.width}
                    onChange={(_, value) =>
                      updateConfig({ width: value as number })
                    }
                    min={200}
                    max={1000}
                    step={50}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Network Height: {config.height}
                  </Typography>
                  <Slider
                    value={config.height}
                    onChange={(_, value) =>
                      updateConfig({ height: value as number })
                    }
                    min={200}
                    max={1000}
                    step={50}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Number of Clusters: {config.numClusters}
                  </Typography>
                  <Slider
                    value={config.numClusters}
                    onChange={(_, value) =>
                      updateConfig({ numClusters: value as number })
                    }
                    min={2}
                    max={20}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Clustering Interval: {config.clusteringInterval}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Number of rounds between re-clustering
                  </Typography>
                  <Slider
                    value={config.clusteringInterval}
                    onChange={(_, value) =>
                      updateConfig({ clusteringInterval: value as number })
                    }
                    min={1}
                    max={50}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Base Station X: {config.bsX ?? config.width / 2}
                  </Typography>
                  <Slider
                    value={config.bsX ?? config.width / 2}
                    onChange={(_, value) =>
                      updateConfig({ bsX: value as number })
                    }
                    min={0}
                    max={config.width}
                    step={10}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Base Station Y: {config.bsY ?? -50}
                  </Typography>
                  <Slider
                    value={config.bsY ?? -50}
                    onChange={(_, value) =>
                      updateConfig({ bsY: value as number })
                    }
                    min={-200}
                    max={config.height}
                    step={10}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Energy Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    TX Energy: {config.energyTxElec}
                  </Typography>
                  <Slider
                    value={config.energyTxElec}
                    onChange={(_, value) =>
                      updateConfig({ energyTxElec: value as number })
                    }
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    RX Energy: {config.energyRxElec}
                  </Typography>
                  <Slider
                    value={config.energyRxElec}
                    onChange={(_, value) =>
                      updateConfig({ energyRxElec: value as number })
                    }
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Distance Factor: {config.distanceFactor}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Energy amplification factor based on distance
                  </Typography>
                  <Slider
                    value={config.distanceFactor}
                    onChange={(_, value) =>
                      updateConfig({ distanceFactor: value as number })
                    }
                    min={0.0001}
                    max={0.01}
                    step={0.0001}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Energy to Satellite: {config.energyToSatellite}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Energy consumed for transmitting to base station
                  </Typography>
                  <Slider
                    value={config.energyToSatellite}
                    onChange={(_, value) =>
                      updateConfig({ energyToSatellite: value as number })
                    }
                    min={1}
                    max={20}
                    step={0.5}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Info-KMeans Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Information Threshold:{" "}
                    {config.informationThreshold?.toFixed(2) || 0.6}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Nodes below this threshold will be put to sleep
                  </Typography>
                  <Slider
                    value={config.informationThreshold || 0.6}
                    onChange={(_, value) =>
                      updateConfig({ informationThreshold: value as number })
                    }
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Nearest Neighbors: {config.nearestNeighbors || 6}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Number of neighbors used for information calculation
                  </Typography>
                  <Slider
                    value={config.nearestNeighbors || 6}
                    onChange={(_, value) =>
                      updateConfig({ nearestNeighbors: value as number })
                    }
                    min={3}
                    max={15}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Entropy Bins: {config.entropyBins || 10}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Number of bins for data discretization
                  </Typography>
                  <Slider
                    value={config.entropyBins || 10}
                    onChange={(_, value) =>
                      updateConfig({ entropyBins: value as number })
                    }
                    min={5}
                    max={20}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    History Window: {config.historyWindow || 5}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Number of historical rounds for temporal analysis
                  </Typography>
                  <Slider
                    value={config.historyWindow || 5}
                    onChange={(_, value) =>
                      updateConfig({ historyWindow: value as number })
                    }
                    min={1}
                    max={20}
                    step={1}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">EEUC Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    EEUC Threshold: {config.eeucThreshold?.toFixed(2) || 0.5}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Threshold for cluster head competition
                  </Typography>
                  <Slider
                    value={config.eeucThreshold || 0.5}
                    onChange={(_, value) =>
                      updateConfig({ eeucThreshold: value as number })
                    }
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    EEUC RCompMax: {config.eeucRCompMax || 100}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Maximum competition radius
                  </Typography>
                  <Slider
                    value={config.eeucRCompMax || 100}
                    onChange={(_, value) =>
                      updateConfig({ eeucRCompMax: value as number })
                    }
                    min={20}
                    max={300}
                    step={10}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    EEUC C: {config.eeucC?.toFixed(2) || 0.5}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Cluster radius adjustment factor
                  </Typography>
                  <Slider
                    value={config.eeucC || 0.5}
                    onChange={(_, value) =>
                      updateConfig({ eeucC: value as number })
                    }
                    min={0.1}
                    max={1.0}
                    step={0.05}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    EEUC TdMax: {config.eeucTdMax || 200}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    gutterBottom
                    display="block"
                  >
                    Maximum distance threshold
                  </Typography>
                  <Slider
                    value={config.eeucTdMax || 200}
                    onChange={(_, value) =>
                      updateConfig({ eeucTdMax: value as number })
                    }
                    min={50}
                    max={500}
                    step={10}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6">Environmental Ranges</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Temperature Range: {config.minTemperature}°C -{" "}
                    {config.maxTemperature}°C
                  </Typography>
                  <Slider
                    value={[config.minTemperature, config.maxTemperature]}
                    onChange={(_, value) => {
                      const [min, max] = value as number[];
                      updateConfig({
                        minTemperature: min,
                        maxTemperature: max,
                      });
                    }}
                    min={0}
                    max={50}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Salinity Range: {config.minSalinity} - {config.maxSalinity}{" "}
                    PSU
                  </Typography>
                  <Slider
                    value={[config.minSalinity, config.maxSalinity]}
                    onChange={(_, value) => {
                      const [min, max] = value as number[];
                      updateConfig({
                        minSalinity: min,
                        maxSalinity: max,
                      });
                    }}
                    min={0}
                    max={50}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    Pressure Range: {config.minPressure} - {config.maxPressure}{" "}
                    dbar
                  </Typography>
                  <Slider
                    value={[config.minPressure, config.maxPressure]}
                    onChange={(_, value) => {
                      const [min, max] = value as number[];
                      updateConfig({
                        minPressure: min,
                        maxPressure: max,
                      });
                    }}
                    min={0}
                    max={200}
                    valueLabelDisplay="auto"
                  />
                </Grid>

                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography gutterBottom>
                    pH Range: {config.minPH} - {config.maxPH}
                  </Typography>
                  <Slider
                    value={[config.minPH, config.maxPH]}
                    onChange={(_, value) => {
                      const [min, max] = value as number[];
                      updateConfig({
                        minPH: min,
                        maxPH: max,
                      });
                    }}
                    min={0}
                    max={14}
                    step={0.1}
                    valueLabelDisplay="auto"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onClose}>
          Apply Settings
        </Button>
      </DialogActions>
    </Dialog>
  );
}
