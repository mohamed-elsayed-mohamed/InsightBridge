#define MyAppName "Insight Bridge API"
#define MyAppVersion "1.0"
#define MyAppPublisher "Insight Bridge"
#define MyAppURL "https://www.insightbridge.com/"

#define OutputEXE "InsightBridge-API"
#define desFolder "API"

#define MainFolder "Out" 

[Setup]
AppId={{3EE9EDE4-9BD3-4518-BAAE-417F1ABBF251}}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={code:GetInsightBridgePath}
DefaultGroupName=Insight Bridge
OutputBaseFilename={#OutputEXE}
Compression=lzma
SolidCompression=yes
DirExistsWarning=no
ArchitecturesInstallIn64BitMode=x64

[Messages]
BeveledLabel=Insight Bridge

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "french"; MessagesFile: "compiler:Languages\French.isl"
Name: "russian"; MessagesFile: "compiler:Languages\Russian.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Files]
Source: "..\\publish\\*"; DestDir: "{app}\\{#desFolder}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Registry]
Root: HKLM; Subkey: "Software\InsightBridge\{#desFolder}"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}";
Root: HKLM; Subkey: "Software\InsightBridge\"; ValueType: string; ValueName: "InstallPath"; ValueData: "{app}"; Flags: createvalueifdoesntexist

[Code]
var
  global_AppCmdFilePath: String;
  global_WebSiteName: String;
  global_vDir: String;
  global_AppCmdExitCode: Integer;
  global_AppURL: String; 
  global_AppPort: String;
  startup_URL: String;
  ResultCode: Integer;
const
  REQ_NET = 1;
  REQ_IIS7UP = 1;
  REQ_INSIGHTBRIDGESERVERSTOP = 0;

  IISApplicationPoolName = 'InsightBridgeAPI';
  IISSiteName = 'Insight Bridge API';

procedure StopInsightBridge();
  var
    ResultCode: Integer;
  begin
    Exec('NET', 'STOP InsightBridge', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

procedure StartInsightBridge();
  var
    ResultCode: Integer;
  begin
    Exec('NET', 'START InsightBridge', '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;

function GetErrorMessageByCode(exitcode: Integer): String;
begin
  Result := 'Error';
end;

function GetInsightBridgePath(Param: String): String;
var 
   folder, installpath: string;
begin
 if RegQueryStringValue(HKLM, 'Software\InsightBridge\','InstallPath', installpath) then
 begin
    folder := installpath;    
 end else begin
  folder := ExpandConstant('{pf}') + '\Insight Bridge';
 end;

 Result := folder;
end;

function ExecAppCmd(params: String): Boolean;
var
  execSuccessfully: Boolean;
  resultCode: Integer;
begin
  execSuccessfully := Exec('cmd.exe', '/c ' + global_AppCmdFilePath + ' ' + params, '', SW_HIDE, ewWaitUntilTerminated, resultCode);

  global_AppCmdExitCode := resultCode;

  Result := execSuccessfully and (resultCode = 0);
end;

function GetIISVersion(): Integer;
var
  iisver: Cardinal;
begin
  if RegQueryDWordValue(HKEY_LOCAL_MACHINE, 'SOFTWARE\Microsoft\InetStp', 'MajorVersion', iisver) then
  begin
    Result := iisver;
  end;
end;

procedure SetupIIS(physicalPath: String);
var
  temp: String;
  sys: String;
  app: String;
  command: String;
  hostname: String;
begin
  sys := ExpandConstant('{sys}');
  app := ExpandConstant('{app}') + '\' + physicalPath;

  global_AppCmdFilePath := sys + '\inetsrv\appcmd.exe';
  global_WebSiteName := IISSiteName;
  global_vDir := IISSiteName;

  if not ExecAppCmd(Format('list apppool /name:"%s"', [IISApplicationPoolName])) then
  begin
    command := Format('add apppool /name:"%s"', [IISApplicationPoolName]);
    if not ExecAppCmd(command) then
    begin
      RaiseException('Failed to create the application pool. Command: ' + command + ' Error: ' + GetErrorMessageByCode(global_AppCmdExitCode));
    end;
  end;
  
  if global_AppURL = 'localhost' then
     hostname := '*';

  if not ExecAppCmd(Format('list site /name:"%s"', [global_WebSiteName])) then
  begin
    command := Format('add site /name:"%s" /bindings:"http/%s:%s:" /physicalPath:"%s"', [global_WebSiteName, hostname, global_AppPort, app]);
    if not ExecAppCmd(command) then
    begin
      RaiseException('Failed to create the site. Command: ' + command + ' Error: ' + GetErrorMessageByCode(global_AppCmdExitCode));
    end;

    command := Format('set app /app.name:"%s/" /applicationPool:"%s"', [global_WebSiteName, IISApplicationPoolName]);
    if not ExecAppCmd(command) then
    begin
      RaiseException('Failed to assign the application pool to the site. Command: ' + command + ' Error: ' + GetErrorMessageByCode(global_AppCmdExitCode));
    end;
  end;
end;

function IsDotNetCoreDetected(): boolean;
var
  dotnetCorePath: String;
begin
  dotnetCorePath := ExpandConstant('{pf}\dotnet\shared\Microsoft.AspNetCore.App');
  result := DirExists(dotnetCorePath);
end;

function IsIIS7UPDetected(): boolean;
begin
  if (REQ_IIS7UP = 0) then begin
    result := true;
  end else begin
    if (GetIISVersion() >= 7) then
      result := true
    else
      result := false;  
  end;
end;

function OnlyToolsRemain(): Boolean;
var
  DirFound: Integer;
  FindRec: TFindRec;
  LastDirFound: String;
begin
  DirFound := 0;
  if FindFirst(ExpandConstant('{app}\*'), FindRec) then begin
    try
      repeat
        if FindRec.Attributes and FILE_ATTRIBUTE_DIRECTORY = FILE_ATTRIBUTE_DIRECTORY then begin
          if ((FindRec.Name <> '.') and (FindRec.Name <> '..')) then begin
            DirFound := DirFound + 1;
            LastDirFound := FindRec.Name;
          end;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;

  if ((DirFound = 1) and (Lowercase(LastDirFound) = 'tools')) then
     result := true
  else 
     result := false;
end;

function InitializeSetup(): Boolean;
begin
  global_AppURL := 'localhost';
  global_AppPort := '5000';
  startup_URL := '/swagger/index.html';
  result := true;
end;

procedure InitializeWizard();
var
  InputPage: TInputQueryWizardPage;
begin
  // InputPage := CreateInputQueryPage(
    // wpWelcome,
    // 'Project Setup',
    // 'Please enter the following information:', 
    // 'These values will be used to configure the project.'
  // );
  
  // InputPage.Add('App URL:', False);
  // InputPage.Add('Port:', False);
  
  // InputPage.Values[0] := global_AppURL;
  // InputPage.Values[1] := global_AppPort;
end;


procedure CurStepChanged(CurStep: TSetupStep);
var
  fullURL: String;
  ResultCode: Integer;
begin
  if (CurStep = ssPostInstall) then
  begin
    SetupIIS('API');
    if (REQ_INSIGHTBRIDGESERVERSTOP = 1) then StartInsightBridge();
  end
  else if (CurStep = ssDone) then
  begin
    fullURL := 'http://' + global_AppURL + ':' + global_AppPort + startup_URL;

    if not Exec('cmd.exe', '/C "start ' + fullURL + '"', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      MsgBox('Failed to open Swagger URL. Error code: ' + IntToStr(ResultCode), mbError, MB_OK);
  end;
end;


procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  toolsonly: Boolean;
begin
   if (CurUninstallStep = usPostUninstall) then begin
      toolsonly := OnlyToolsRemain();
      if (toolsonly) then begin
         DelTree(ExpandConstant('{app}\Tools'), True, True, True);
         DelTree(ExpandConstant('{group}'), True, True, True);
         RemoveDir(ExpandConstant('{app}'));
      end;
   end;
end;