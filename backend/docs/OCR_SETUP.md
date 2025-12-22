# OCR Setup Guide for Synapse

This guide covers installing and configuring OCR capabilities for Synapse.

## System Dependencies

### Arch Linux

```bash
# Install Tesseract OCR and language packs
sudo pacman -S tesseract tesseract-data-eng

# For additional languages (e.g., German)
sudo pacman -S tesseract-data-deu

# Install Ghostscript (required by ocrmypdf)
sudo pacman -S ghostscript

# Install pdftotext (from poppler)
sudo pacman -S poppler
```

### Ubuntu/Debian

```bash
sudo apt-get update
sudo apt-get install tesseract-ocr tesseract-ocr-eng ghostscript poppler-utils
```

---

## Python Dependencies

```bash
cd backend
pip install ocrmypdf pikepdf pillow
```

Or add to `requirements.txt`:

```text
ocrmypdf>=16.0.0
pikepdf>=8.0.0
Pillow>=10.0.0
```

---

## Configuration

OCR settings are configured via environment variables (prefix: `SYNAPSE_OCR_`):

| Variable | Default | Description |
|----------|---------|-------------|
| `SYNAPSE_OCR_ENABLED` | `true` | Enable/disable OCR |
| `SYNAPSE_OCR_LANGUAGE` | `eng` | Tesseract language(s), e.g., `eng+deu` |
| `SYNAPSE_OCR_MODE` | `skip` | `skip` (skip text pages), `force`, `redo` |
| `SYNAPSE_OCR_IMAGE_DPI` | `300` | Default DPI for images |
| `SYNAPSE_OCR_DESKEW` | `true` | Straighten tilted scans |
| `SYNAPSE_OCR_ROTATE_PAGES` | `true` | Auto-rotate pages |
| `SYNAPSE_OCR_CLEAN` | `clean` | `none`, `clean`, `clean-final` |

Example `.env`:

```env
SYNAPSE_OCR_ENABLED=true
SYNAPSE_OCR_LANGUAGE=eng
SYNAPSE_OCR_MODE=skip
SYNAPSE_OCR_IMAGE_DPI=300
SYNAPSE_OCR_DESKEW=true
```

---

## Running OCR Worker

Start a dedicated worker for OCR tasks:

```bash
celery -A app.services.background.celery_app worker \
    --queues=ocr \
    --concurrency=2 \
    --loglevel=info
```

**Note**: OCR is CPU-intensive. Limit concurrency to prevent system overload.

---

## Usage

### Automatic OCR (via DocumentProcessor)

OCR is triggered automatically when:

- PDF has < 50 characters of extractable text
- Image files are uploaded (PNG, JPEG, TIFF, etc.)

```python
from app.services.background.document_processor import DocumentProcessor

processor = DocumentProcessor(enable_ocr=True)
result = processor.process_document("scan.pdf", "pdf")
print(result["content_text"])
print(f"OCR performed: {result['ocr_performed']}")
```

### Direct OCR (via OcrProcessor)

```python
from app.services.ocr import OcrProcessor

with OcrProcessor() as processor:
    result = processor.process_file("document.pdf")
    print(result["text"])
```

### Celery Task

```python
from app.services.background.ocr_tasks import ocr_document_task

# Queue OCR in background
task = ocr_document_task.delay("/path/to/document.pdf")
result = task.get()
print(result["text"])
```

---

## Verification

Test that OCR is working:

```bash
# Check Tesseract
tesseract --version

# Check ocrmypdf
ocrmypdf --version

# Test Python import
python -c "from app.services.ocr import OcrProcessor; print('✅ OCR ready')"
```

---

## Troubleshooting

### "No module named 'ocrmypdf'"

```bash
pip install ocrmypdf
```

### "tesseract is not installed or not in PATH"

```bash
# Arch Linux
sudo pacman -S tesseract tesseract-data-eng

# Ubuntu
sudo apt-get install tesseract-ocr
```

### Low OCR Quality

1. Increase DPI: `SYNAPSE_OCR_IMAGE_DPI=400`
2. Enable deskew: `SYNAPSE_OCR_DESKEW=true`
3. Check input quality (300+ DPI scans recommended)

### Memory Issues

For large documents, limit concurrency and increase timeouts:

```bash
celery -A app.services.background.celery_app worker \
    --queues=ocr \
    --concurrency=1 \
    --max-tasks-per-child=5
```
