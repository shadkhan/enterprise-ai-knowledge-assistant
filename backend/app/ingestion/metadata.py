from app.schemas.documents import DocumentCreate


def extract_metadata(payload: DocumentCreate) -> dict:
    # TODO: Replace with parsers for PDF, Office, Confluence, SharePoint, Jira, and HTML.
    return {
        "source_type": payload.source_type,
        "department": payload.department,
        "classification": payload.classification,
        "tags": payload.tags,
    }

