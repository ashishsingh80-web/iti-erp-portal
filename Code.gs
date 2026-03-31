const SHEETS = {
  students: 'STUDENTS_MASTER',
  institutes: 'INSTITUTE_MASTER',
  trades: 'TRADE_MASTER',
  agents: 'AGENTS_MASTER',
  admissionDesk: 'ADMISSION_DESK'
};

const CONFIG = {
  appTitle: 'ITI Staff Panel',
  studentCacheKey: 'iti_students_cache_v3',
  masterCacheKey: 'iti_masters_cache_v2',
  validationCacheKey: 'iti_master_validation_v2',
  docsRootFolderId: '1d-tTL7oQaOf20WoAdBTUyLEL3yJ1IPMu'
};

const STUDENT_MANUAL_FIELDS = [
  'Institute_ID',
  'Student_Name',
  'Trade',
  'Session',
  'Year',
  'Mobile',
  'Father_Name',
  'Mother_Name',
  'Gender',
  'Category',
  'Address',
  'Email_ID',
  'Photo_Available',
  'Aadhaar_No',
  'Caste_Certificate_Available',
  'Income_Certificate_Available',
  'Bank_Account_No',
  'IFSC_Code',
  'Bank_Name',
  'Agent_ID',
  'Payment_Mode',
  'Agent_Agreement_Status',
  'Agreement_Effective_Date',
  'Agreement_Revision_No',
  'PRN_Number',
  'SCVTUP_Registration_No',
  'Scholarship_Application_Status',
  'Scholarship_ID',
  'Scholarship_Query_Text',
  'Query_Submission_Date',
  'Scholarship_Approved_Date',
  'Scholarship_Credited_Amount',
  'Scholarship_Credit_Date',
  'Fees_If_Scholarship',
  'Fees_If_No_Scholarship',
  'Practical_Exam_Admin_Override',
  'Undertaking_Generated_URL',
  'Undertaking_Generation_Status',
  'Undertaking_Generated_On',
  'Undertaking_Print_Count',
  'Admission_Form_Status',
  'Documents_Verified_Status',
  'Undertaking_Signed_Status',
  'Completed_By',
  'Completion_Date'
];

const STUDENT_REQUIRED_FIELDS = [
  'Institute_ID',
  'Student_Name',
  'Trade',
  'Session',
  'Year',
  'Mobile'
];

function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.appTitle)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function bootstrapApp() {
  return {
    appTitle: CONFIG.appTitle,
    masters: getAdmissionFormMasters(),
    dashboard: getDashboardData(),
    students: getStudents({})
  };
}

function getDashboardData() {
  const students = getValidStudents_();
  const recentAdmissions = students.slice(-10).reverse();
  const pendingWork = students.filter(isAdmissionPending_).slice(0, 20);
  const dueList = students.filter(hasDueAmount_).slice(0, 20);

  return {
    cards: {
      totalStudents: students.length,
      pendingAdmissions: pendingWork.length,
      documentsPending: students.filter(isDocumentsPending_).length,
      undertakingsPending: students.filter(isUndertakingPending_).length,
      prnPending: students.filter(function(row) {
        return !toText_(row.PRN_Number);
      }).length,
      scvtPending: students.filter(function(row) {
        return !toText_(row.SCVTUP_Registration_No);
      }).length,
      scholarshipQueries: students.filter(function(row) {
        return toText_(row.Scholarship_Application_Status) === 'Query by Deptt.';
      }).length,
      dueStudents: dueList.length
    },
    recentAdmissions: recentAdmissions.map(function(row) {
      return {
        date: row.Undertaking_Generated_On || row.Completion_Date || '',
        studentName: row.Student_Name || '',
        trade: row.Trade || '',
        institute: row.Institute_ID || '',
        admissionStatus: row.Admission_Completion_Status || row.Admission_Status || ''
      };
    }),
    pendingWork: pendingWork.map(function(row) {
      return {
        studentName: row.Student_Name || '',
        missingStep: getMissingStep_(row),
        responsibleTeam: getResponsibleTeam_(row)
      };
    }),
    dueList: dueList.map(function(row) {
      return {
        studentName: row.Student_Name || '',
        finalFees: row.Final_Fees || 0,
        paid: row.Paid_Amount || 0,
        due: row.Due_Amount || 0
      };
    })
  };
}

function getAdmissionFormMasters() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CONFIG.masterCacheKey);
  if (cached) return JSON.parse(cached);

  const payload = {
    institutes: getRowsAsObjects_(SHEETS.institutes)
      .filter(function(row) { return !!toText_(row.Institute_ID); })
      .map(function(row) {
        return {
          id: row.Institute_ID,
          name: row.Institute_Name,
          code: row.Code,
          address: row.Institute_Address || ''
        };
      }),
    trades: getRowsAsObjects_(SHEETS.trades)
      .filter(function(row) { return !!toText_(row.Trade); })
      .map(function(row) {
        return {
          trade: row.Trade,
          tradeCode: row.Trade_Code,
          duration: row.Duration,
          instituteId: row.Institute_ID,
          ncvtScvt: row.NCVT_SCVT,
          standardFees: row.Standard_Fees,
          status: row.Status
        };
      }),
    agents: getRowsAsObjects_(SHEETS.agents)
      .filter(function(row) { return !!toText_(row.Agent_ID); })
      .map(function(row) {
        return {
          id: row.Agent_ID,
          name: row.Agent_Name,
          mobile: row.Mobile
        };
      }),
    staticOptions: {
      year: ['1st', '2nd'],
      gender: ['Male', 'Female', 'Other'],
      category: ['General', 'OBC', 'SC', 'ST', 'Other'],
      paymentMode: ['Direct', 'Agent'],
      scholarshipStatus: ['Not Applied', 'Applied', 'Under Process', 'Query by Deptt.', 'Approved', 'Rejected'],
      photoAvailable: ['Yes', 'No'],
      casteCertificate: ['Yes', 'No', 'Not Required'],
      incomeCertificate: ['Yes', 'No'],
      admissionFormStatus: ['Not Started', 'In Progress', 'Completed'],
      documentStatus: ['Pending', 'Verified', 'Incomplete'],
      undertakingStatus: ['Pending', 'Signed', 'Uploaded']
    }
  };

  cache.put(CONFIG.masterCacheKey, JSON.stringify(payload), 300);
  return payload;
}

function getStudents(filters) {
  const safeFilters = filters || {};
  let students = getValidStudents_();

  if (safeFilters.instituteId) {
    students = students.filter(function(row) {
      return toText_(row.Institute_ID) === toText_(safeFilters.instituteId);
    });
  }

  if (safeFilters.trade) {
    students = students.filter(function(row) {
      return toText_(row.Trade) === toText_(safeFilters.trade);
    });
  }

  if (safeFilters.session) {
    const session = toText_(safeFilters.session).toLowerCase();
    students = students.filter(function(row) {
      return toText_(row.Session).toLowerCase().indexOf(session) !== -1;
    });
  }

  if (safeFilters.year) {
    students = students.filter(function(row) {
      return toText_(row.Year) === toText_(safeFilters.year);
    });
  }

  if (safeFilters.admissionStatus) {
    students = students.filter(function(row) {
      return toText_(row.Admission_Completion_Status || row.Admission_Status) === toText_(safeFilters.admissionStatus);
    });
  }

  if (safeFilters.search) {
    const q = toText_(safeFilters.search).toLowerCase();
    students = students.filter(function(row) {
      return [
        row.Student_Name,
        row.Student_ID,
        row.Mobile,
        row.Trade,
        row.Institute_ID
      ].some(function(value) {
        return toText_(value).toLowerCase().indexOf(q) !== -1;
      });
    });
  }

  return students.map(function(row) {
    return {
      Student_ID: row.Student_ID || '',
      Student_Name: row.Student_Name || '',
      Institute_ID: row.Institute_ID || '',
      Trade: row.Trade || '',
      Session: row.Session || '',
      Year: row.Year || '',
      Mobile: row.Mobile || '',
      Admission_Status: row.Admission_Completion_Status || row.Admission_Status || '',
      Document_Status: row.Documents_Verified_Status || '',
      Undertaking_Status: row.Undertaking_Signed_Status || '',
      Final_Fees: row.Final_Fees || '',
      Due_Amount: row.Due_Amount || '',
      Undertaking_Link: row.Undertaking_Generated_URL || ''
    };
  });
}

function saveStudent(formData) {
  const payload = formData || {};
  const missing = STUDENT_REQUIRED_FIELDS.filter(function(field) {
    return !toText_(payload[field]);
  });

  if (missing.length) {
    throw new Error('Missing required fields: ' + missing.join(', '));
  }

  validateStudentMasterData_(payload);

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    const sheet = getSheet_(SHEETS.students);
    const headers = getHeaders_(SHEETS.students);
    const headerMap = getHeaderMapFromHeaders_(headers);
    const targetRow = getNextWritableRowByHeader_(sheet, headerMap, 'Institute_ID', 2);

    writeManualFieldsFast_(sheet, targetRow, headerMap, payload, STUDENT_MANUAL_FIELDS);

    SpreadsheetApp.flush();
    clearAllCaches_();

    return {
      success: true,
      row: targetRow,
      studentId: headerMap.Student_ID ? sheet.getRange(targetRow, headerMap.Student_ID).getDisplayValue() : ''
    };
  } finally {
    lock.releaseLock();
  }
}

function saveStudentDocuments(studentId, studentName, files) {
  if (!CONFIG.docsRootFolderId) {
    throw new Error('Drive root folder is not configured.');
  }

  const rootFolder = DriveApp.getFolderById(CONFIG.docsRootFolderId);
  const studentFolder = getOrCreateSubfolder_(rootFolder, studentName + ' - ' + studentId);
  const uploaded = [];

  (files || []).forEach(function(file) {
    if (!file || !file.fileName || !file.base64Data) return;

    const bytes = Utilities.base64Decode(file.base64Data);
    const blob = Utilities.newBlob(bytes, file.mimeType || 'application/octet-stream', file.fileName);
    const created = studentFolder.createFile(blob);

    uploaded.push({
      documentType: file.documentType || 'Document',
      fileName: created.getName(),
      url: created.getUrl(),
      fileId: created.getId()
    });
  });

  return {
    success: true,
    folderName: studentFolder.getName(),
    uploaded: uploaded
  };
}

function debugStudentRead() {
  const rows = getValidStudents_();
  return {
    count: rows.length,
    sample: rows.slice(0, 5)
  };
}

function debugDashboardCounts() {
  return getDashboardData();
}

function getSheet_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error('Sheet not found: ' + name);
  return sheet;
}

function getHeaders_(sheetName) {
  const sheet = getSheet_(sheetName);
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function getHeaderMapFromHeaders_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    const key = toText_(header);
    if (key) map[key] = index + 1;
  });
  return map;
}

function getRowsAsObjects_(sheetName) {
  const sheet = getSheet_(sheetName);
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return [];

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return values.map(function(row, index) {
    const obj = {};
    headers.forEach(function(header, colIndex) {
      obj[header] = row[colIndex];
    });
    obj.__rowNumber = index + 2;
    return obj;
  });
}

function getValidStudents_() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CONFIG.studentCacheKey);
  if (cached) return JSON.parse(cached);

  const rows = getRowsAsObjects_(SHEETS.students).filter(function(row) {
    return !!toText_(row.Institute_ID) && !!toText_(row.Student_Name) && !!toText_(row.Trade);
  });

  cache.put(CONFIG.studentCacheKey, JSON.stringify(rows), 120);
  return rows;
}

function clearAllCaches_() {
  const cache = CacheService.getScriptCache();
  cache.remove(CONFIG.studentCacheKey);
  cache.remove(CONFIG.masterCacheKey);
  cache.remove(CONFIG.validationCacheKey);
}

function validateStudentMasterData_(formData) {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(CONFIG.validationCacheKey);
  let masterData = cached ? JSON.parse(cached) : null;

  if (!masterData) {
    masterData = {
      institutes: getRowsAsObjects_(SHEETS.institutes).map(function(row) {
        return toText_(row.Institute_ID);
      }).filter(Boolean),
      trades: getRowsAsObjects_(SHEETS.trades).map(function(row) {
        return toText_(row.Trade).toLowerCase();
      }).filter(Boolean),
      agents: getRowsAsObjects_(SHEETS.agents).map(function(row) {
        return toText_(row.Agent_ID);
      }).filter(Boolean)
    };
    cache.put(CONFIG.validationCacheKey, JSON.stringify(masterData), 300);
  }

  const instituteId = toText_(formData.Institute_ID);
  const trade = toText_(formData.Trade).toLowerCase();
  const agentId = toText_(formData.Agent_ID);

  if (instituteId && masterData.institutes.indexOf(instituteId) === -1) {
    throw new Error('Invalid Institute_ID: ' + instituteId);
  }
  if (trade && masterData.trades.indexOf(trade) === -1) {
    throw new Error('Invalid Trade: ' + formData.Trade);
  }
  if (agentId && masterData.agents.indexOf(agentId) === -1) {
    throw new Error('Invalid Agent_ID: ' + agentId);
  }
}

function getNextWritableRowByHeader_(sheet, headerMap, headerName, startRow) {
  const colIndex = headerMap[headerName];
  if (!colIndex) throw new Error('Header not found: ' + headerName);

  const lastRow = sheet.getLastRow();
  if (lastRow < startRow) return startRow;

  const values = sheet.getRange(startRow, colIndex, lastRow - startRow + 1, 1).getDisplayValues().flat();
  for (var i = 0; i < values.length; i += 1) {
    if (!toText_(values[i])) return startRow + i;
  }
  return lastRow + 1;
}

function writeManualFieldsFast_(sheet, rowNumber, headerMap, formData, fields) {
  const updates = fields.map(function(field) {
    return {
      colIndex: headerMap[field],
      value: normalizeStudentFieldValue_(field, formData[field])
    };
  }).filter(function(item) {
    return !!item.colIndex;
  }).sort(function(a, b) {
    return a.colIndex - b.colIndex;
  });

  var group = [];

  updates.forEach(function(item) {
    if (!group.length || item.colIndex === group[group.length - 1].colIndex + 1) {
      group.push(item);
      return;
    }

    flushWriteGroup_(sheet, rowNumber, group);
    group = [item];
  });

  if (group.length) flushWriteGroup_(sheet, rowNumber, group);
}

function flushWriteGroup_(sheet, rowNumber, group) {
  sheet.getRange(rowNumber, group[0].colIndex, 1, group.length)
    .setValues([group.map(function(item) { return item.value; })]);
}

function normalizeStudentFieldValue_(field, value) {
  if (value === null || value === undefined) return '';

  const dateFields = {
    Agreement_Effective_Date: true,
    Query_Submission_Date: true,
    Scholarship_Approved_Date: true,
    Scholarship_Credit_Date: true,
    Undertaking_Generated_On: true,
    Completion_Date: true
  };

  const numberFields = {
    Scholarship_Credited_Amount: true,
    Fees_If_Scholarship: true,
    Fees_If_No_Scholarship: true,
    Undertaking_Print_Count: true
  };

  if (typeof value === 'string') value = value.trim();

  if (dateFields[field]) {
    if (!value) return '';
    const date = new Date(value);
    return isNaN(date.getTime()) ? value : date;
  }

  if (numberFields[field]) {
    if (value === '') return '';
    return isNaN(Number(value)) ? value : Number(value);
  }

  return value;
}

function getMissingStep_(row) {
  if (toText_(row.Admission_Form_Status) !== 'Completed') return 'Admission Form';
  if (toText_(row.Documents_Verified_Status) !== 'Verified') return 'Document Verification';
  if (!toText_(row.Undertaking_Signed_Status) || toText_(row.Undertaking_Signed_Status) === 'Pending') return 'Undertaking Signature';
  if (!toText_(row.PRN_Number)) return 'PRN Pending';
  if (!toText_(row.SCVTUP_Registration_No)) return 'SCVT Pending';
  return 'Review';
}

function getResponsibleTeam_(row) {
  if (toText_(row.Admission_Form_Status) !== 'Completed') return 'Admission Staff';
  if (toText_(row.Documents_Verified_Status) !== 'Verified') return 'Admission Desk';
  if (!toText_(row.Undertaking_Signed_Status) || toText_(row.Undertaking_Signed_Status) === 'Pending') return 'Admission Staff';
  if (!toText_(row.PRN_Number) || !toText_(row.SCVTUP_Registration_No)) return 'Scholarship/PRN Desk';
  return 'Admin';
}

function isAdmissionPending_(row) {
  const status = toText_(row.Admission_Completion_Status || row.Admission_Status);
  return !status || status === 'Pending' || status === 'In Progress' || status === 'Not Started';
}

function isDocumentsPending_(row) {
  const status = toText_(row.Documents_Verified_Status);
  return !status || status === 'Pending' || status === 'Incomplete';
}

function isUndertakingPending_(row) {
  const status = toText_(row.Undertaking_Signed_Status);
  return !status || status === 'Pending';
}

function hasDueAmount_(row) {
  return Number(row.Due_Amount || 0) > 0;
}

function getOrCreateSubfolder_(parentFolder, folderName) {
  const folders = parentFolder.getFoldersByName(folderName);
  return folders.hasNext() ? folders.next() : parentFolder.createFolder(folderName);
}

function toText_(value) {
  return String(value || '').trim();
}
