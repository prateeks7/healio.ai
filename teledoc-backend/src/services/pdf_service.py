from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from datetime import datetime

def generate_report_pdf(report_data: dict, patient_name: str = "Patient") -> BytesIO:
    """
    Generates a PDF report from the doctor's report data.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=50, leftMargin=50, topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='Justify', alignment=1, spaceAfter=6))
    styles.add(ParagraphStyle(name='CustomBullet', parent=styles['Normal'], bulletIndent=10, leftIndent=20, spaceAfter=4))
    
    # Custom Styles
    title_style = styles["Heading1"]
    title_style.alignment = 1 # Center
    title_style.textColor = colors.HexColor("#1e40af") # Blue-800
    
    h2_style = styles["Heading2"]
    h2_style.textColor = colors.HexColor("#2563eb") # Blue-600
    h2_style.spaceBefore = 12
    h2_style.spaceAfter = 6
    
    h3_style = styles["Heading3"]
    h3_style.textColor = colors.HexColor("#4b5563") # Gray-600
    h3_style.spaceBefore = 8
    
    normal_style = styles["Normal"]
    normal_style.spaceAfter = 6
    
    elements = []
    
    # --- Header ---
    elements.append(Paragraph("Healio.AI Medical Report", title_style))
    elements.append(Spacer(1, 12))
    
    # --- Patient Info & Metadata ---
    doctor_report = report_data.get("doctor_report", {})
    urgency = doctor_report.get("urgency", "Routine").upper()
    urgency_color = colors.red if urgency == "EMERGENCY" else colors.black
    
    data = [
        ["Patient Name:", patient_name],
        ["Report ID:", report_data.get("report_id", "N/A")],
        ["Date:", datetime.now().strftime("%Y-%m-%d %H:%M")],
        ["Urgency:", urgency]
    ]
    
    # Increased widths to use available space (approx 7 inches)
    t = Table(data, colWidths=[2*inch, 5*inch])
    t.setStyle(TableStyle([
        ('FONTNAME', (0,0), (0,-1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (0,3), (1,3), urgency_color),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'), # Explicit Left Alignment
    ]))
    elements.append(t)
    elements.append(Spacer(1, 36)) # Increased spacing back to 24
    
    # --- 1. Red Flags / Warnings ---
    red_flags = doctor_report.get("red_flags", [])
    if red_flags:
        elements.append(Paragraph("1. Red Flags / Warnings", h2_style))
        for flag in red_flags:
            # Ensure bold tags are closed and formatted correctly
            elements.append(Paragraph(f"• <font color='red'><b>{flag}</b></font>", styles['CustomBullet']))
            
    # --- 2. Historical Reference ---
    history = doctor_report.get("pertinent_history", [])
    if history:
        elements.append(Paragraph("2. Historical Reference", h2_style))
        for item in history:
            elements.append(Paragraph(f"• {item}", styles['CustomBullet']))

    # --- 3. Summary of Consultation ---
    elements.append(Paragraph("3. Summary of Consultation", h2_style))
    patient_summary = report_data.get("patient_summary", "No summary available.")
    elements.append(Paragraph(patient_summary, normal_style))
    
    # --- 4. Uploaded Files & Analysis ---
    # Fetch file summaries from database
    from src.db.client import get_database
    from bson import ObjectId
    import asyncio
    
    async def get_file_summaries(report_data):
        db = get_database()
        chat_id = report_data.get("chat_id")
        if not chat_id:
            return []
        
        chat_doc = await db.chats.find_one({"chat_id": chat_id})
        if not chat_doc:
            return []
        
        file_summaries = []
        for msg in chat_doc.get("messages", []):
            if msg.get("attachments"):
                for file_id in msg["attachments"]:
                    try:
                        upload_doc = await db.uploads.find_one({"file_id": ObjectId(file_id)})
                        if upload_doc:
                            filename = upload_doc.get("filename", "Unknown File")
                            summary = upload_doc.get("image_summary", "Processing...")
                            if summary and summary != "Processing...":
                                file_summaries.append(f"{filename}: {summary}")
                    except:
                        pass
        return file_summaries
    
    # Run async function to get file summaries
    try:
        loop = asyncio.get_event_loop()
        file_summaries = loop.run_until_complete(get_file_summaries(report_data))
    except:
        file_summaries = []
    
    if file_summaries:
        elements.append(Paragraph("4. Uploaded Files & Analysis", h2_style))
        for file_info in file_summaries:
            elements.append(Paragraph(f"• {file_info}", styles['CustomBullet']))
    
    # --- 5. Diagnosis ---
    elements.append(Paragraph("5. Diagnosis", h2_style))
    
    assessment = doctor_report.get("assessment", {})
    primary = assessment.get("primary_diagnosis", {})
    
    # Primary Diagnosis
    elements.append(Paragraph(f"<b>Primary Diagnosis:</b> {primary.get('name', 'N/A')}", normal_style))
    elements.append(Paragraph(f"<b>Confidence:</b> {int(primary.get('confidence', 0)*100)}%", normal_style))
    
    # Rationale
    rationale = doctor_report.get("llm_rationale")
    if rationale:
        elements.append(Paragraph("<b>Reason for Diagnosis:</b>", h3_style))
        elements.append(Paragraph(rationale, normal_style))
        
    # Differentials
    differentials = assessment.get("differentials", [])
    if differentials:
        elements.append(Paragraph("<b>Differential Diagnoses:</b>", h3_style))
        for diff in differentials:
            elements.append(Paragraph(f"• {diff.get('name')} ({int(diff.get('confidence', 0)*100)}%)", styles['CustomBullet']))
            
    # --- 6. Suggested Cure & Treatment Plan ---
    elements.append(Paragraph("6. Suggested Cure & Treatment Plan", h2_style))
    treatment_plan = doctor_report.get("treatment_plan", "")
    
    # Split by newlines to create bullet points if it looks like a list, otherwise just paragraph
    if treatment_plan:
        if "\n" in treatment_plan:
            for line in treatment_plan.split("\n"):
                if line.strip():
                    elements.append(Paragraph(line.strip(), normal_style))
        else:
             elements.append(Paragraph(treatment_plan, normal_style))

    # Also include plan_recommendations as bullet points if available
    recommendations = doctor_report.get("plan_recommendations", [])
    if recommendations:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph("<b>Key Recommendations:</b>", h3_style))
        for rec in recommendations:
             elements.append(Paragraph(f"• {rec}", styles['CustomBullet']))

    # --- Footer ---
    elements.append(Spacer(1, 36))
    elements.append(Paragraph("<i>Generated by Healio.AI Assistant. This is not a substitute for professional medical advice.</i>", styles["Italic"]))

    doc.build(elements)
    buffer.seek(0)
    return buffer
