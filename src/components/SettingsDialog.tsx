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
