# QA Gates

`photo-style` v0 is not AI vision QA. It is a conservative preflight around a low-risk image operation.

## Hard fail

- Source image is missing.
- Source image format is unsupported.
- Processing throws.
- Output file is missing.
- Output dimensions are not 1000 x 1500.
- Source hash changes during processing.

## Warning

- Source image is very small.
- Source aspect ratio is far from 2:3, so the output may have padding.
- Pinterest target metadata is incomplete.
- Style reference stats required a strong brightness or saturation adjustment.

## Pass

- Output exists.
- Output is 2:3.
- Source hash is unchanged.
- Item has no hard failures.

## Human approval remains mandatory

The script cannot reliably prove that calligraphy text, product edges, material, or name spelling are unchanged. The contact sheet is the gate for that.
