/**
 * Slashpage Publisher Plugin for Obsidian
 * 
 * 이 플러그인은 옵시디언 노트를 Slashpage에 발행할 수 있게 해줍니다.
 * 기능:
 * - 옵시디언 노트를 Slashpage에 원클릭으로 발행
 * - 마크다운 형식 그대로 Slashpage에 게시
 * - 폴더별 다른 Slashpage 채널로 발행 가능
 */

import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, requestUrl } from 'obsidian';
import 'obsidian';


interface FolderChannelMapping {
	folderPath: string;
	domainName: string;
	channelHash: string;
	tokenKey: string;
}

interface SlashpagePublisherSettings {
	defaultDomainName: string;
	defaultChannelHash: string;
	defaultTokenKey: string;
	folderMappings: FolderChannelMapping[];
}

const DEFAULT_SETTINGS: SlashpagePublisherSettings = {
	defaultDomainName: '',
	defaultChannelHash: '',
	defaultTokenKey: '',
	folderMappings: []
}

/**
 * Slashpage Publisher 플러그인의 메인 클래스
 */
export default class SlashpagePublisherPlugin extends Plugin {
	/** 플러그인 설정 */
	settings: SlashpagePublisherSettings;

	/**
	 * 플러그인이 로드될 때 호출됩니다
	 */
	async onload() {
		await this.loadSettings();
		this.registerUIElements();
		this.registerCommands();
		this.addSettingTab(new SlashpagePublisherSettingTab(this.app, this));
	}

	/**
	 * UI 요소를 등록합니다 (리본 아이콘 등)
	 */
	private registerUIElements(): void {
		// Add ribbon icon
		this.addRibbonIcon('paper-plane', 'Publish to Slashpage', (evt: MouseEvent) => {
			const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (activeView) {
				this.publishToSlashpage(activeView);
			} else {
				new Notice('Please open a markdown file to publish.');
			}
		});
	}

	/**
	 * 명령어를 등록합니다
	 */
	private registerCommands(): void {
		// Add command
		this.addCommand({
			id: 'publish-to-slashpage',
			name: 'Publish to Slashpage',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.publishToSlashpage(view);
			}
		});
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * 현재 파일의 내용과 제목을 가져옵니다
	 */
	getCurrentFileContent(view: MarkdownView): { title: string, content: string } | null {
		if (!view.file) {
			new Notice('열린 파일을 찾을 수 없습니다.');
			return null;
		}
		const title = view.file.basename;
		const content = view.editor.getValue();
		return { title, content };
	}

	/**
	 * 파일 경로에 따른 적절한 채널 설정을 찾습니다
	 */
	findChannelSettings(filePath: string): { domainName: string, channelHash: string, tokenKey: string } | null {
		const fileFolder = filePath.substring(0, filePath.lastIndexOf('/'));
		
		// 폴더 매핑에서 가장 적합한 설정 찾기
		let domainName = this.settings.defaultDomainName;
		let channelHash = this.settings.defaultChannelHash;
		let tokenKey = this.settings.defaultTokenKey;
		
		// 가장 긴 경로 매칭을 찾기 (더 구체적인 폴더 설정이 우선)
		let longestMatch = -1;
		
		for (const mapping of this.settings.folderMappings) {
			if (fileFolder.startsWith(mapping.folderPath) && mapping.folderPath.length > longestMatch) {
				longestMatch = mapping.folderPath.length;
				domainName = mapping.domainName;
				channelHash = mapping.channelHash;
				tokenKey = mapping.tokenKey;
			}
		}
		
		// Check if settings are complete
		if (!domainName || !channelHash || !tokenKey) {
			new Notice('Please complete Slashpage settings first.');
			return null;
		}

		return { domainName, channelHash, tokenKey };
	}

	/**
	 * Slashpage API를 호출하여 노트를 발행합니다
	 */
	async callSlashpageAPI(domainName: string, channelHash: string, tokenKey: string, title: string, content: string): Promise<boolean> {
		try {
			// API 엔드포인트 URL
			const apiUrl = `https://slashpage.com/api-webhook/note/${domainName}/${channelHash}/${tokenKey}`;
			
			// CORS 문제로 인해 직접 API 호출 대신 사용자 친화적 대안 제공
			console.log('CORS 제한으로 인해 직접 API 호출 대신 대안 방식을 제공합니다.');
			
			// 요청 본문 구성
			const requestBody = JSON.stringify({
				title: title,
				body: content
			}, null, 2);
			
			// curl 명령어 생성
			const curlCommand = `curl -X POST -H "Content-Type: application/json" \\
  --data-raw '${requestBody.replace(/'/g, "\\'")}' \\
  ${apiUrl}`;
			
			// 디버깅용 로그 - 기본 정보
			console.log('Slashpage API URL:', apiUrl);
			console.log('발행할 노트 제목:', title);
			console.log('본문 길이:', content.length);
			
			// 디버깅 정보 추가 - 상세 요청 정보 확인을 위한 코드
			console.log('===== 디버깅 정보 시작 =====');
			// 요청 헤더 정보 정의
			const debugHeaders = {
				'Content-Type': 'application/json',
				'User-Agent': 'ObsidianSlashpagePublisher/1.0',
				'Accept': '*/*',
				'Origin': 'app://obsidian.md',
				'Referer': 'app://obsidian.md/'
			};
			
			// 실제 요청 헤더 확인
			const actualHeaders = new Headers(debugHeaders);
			const actualHeadersObj: Record<string, string> = {};
			console.log('실제 요청 헤더 정보:');
			actualHeaders.forEach((value, key) => {
				actualHeadersObj[key] = value;
				console.log(`- ${key}: ${value}`);
			});
			console.log('실제 요청 헤더(JSON):', JSON.stringify(actualHeadersObj, null, 2));
			
			// Request 객체 정보
			const testRequest = new Request(apiUrl, {
				method: 'POST',
				headers: debugHeaders,
				body: requestBody,
				mode: 'cors'
			});
			console.log('Request 요청 URL:', testRequest.url);
			console.log('Request 요청 메서드:', testRequest.method);
			console.log('요청 본문 샘플 (처음 200자):', requestBody.substring(0, 200) + (requestBody.length > 200 ? '...' : ''));
			
			// 테스트 요청 정보 출력 (requestUrl 함수를 사용하여 CORS 제한 우회)
			try {
				console.log('requestUrl 함수를 사용한 요청 시도...');
				const testResponse = await requestUrl({
					url: apiUrl,
					method: 'POST',
					headers: debugHeaders,
					body: requestBody
				});
				console.log('응답 상태:', testResponse.status);
				console.log('응답 헤더:', testResponse.headers);
				console.log('응답 본문:', testResponse.text);
				
				// 성공적으로 요청이 완료되면 사용자에게 알림
				new Notice(`Slashpage에 노트가 성공적으로 발행되었습니다!\n\n발행된 노트 확인하기:\nhttps://slashpage.com/${domainName}/`);
				return true;
			} catch (debugError) {
				console.log('요청 오류 발생:', debugError);
				console.log('요청 정보는 콘솔에서 확인 가능합니다.');
				
				// 오류 발생 시 curl 명령어 사용 안내
				// curl 명령어를 클립보드에 복사하고 사용자에게 안내 메시지 표시
				await navigator.clipboard.writeText(curlCommand).catch(err => {
					console.error('클립보드 복사 실패:', err);
				});
				
				new Notice(`Slashpage API 요청 중 오류가 발생했습니다.\n\ncurl 명령어가 클립보드에 복사되었습니다.\n터미널에 붙여넣어 실행하세요.\n\n또는 다음 URL에서 발행된 노트를 확인하세요:\nhttps://slashpage.com/${domainName}/`, 15000);
			}
			console.log('===== 디버깅 정보 끝 =====');
			
			return true;
		} catch (error) {
			console.error('Slashpage 발행 준비 오류:', error);
			new Notice('Slashpage 발행 준비 중 오류가 발생했습니다. 자세한 내용은 콘솔을 확인해주세요.');
			return false;
		}
	}

	/**
	 * 현재 열린 노트를 Slashpage에 발행합니다
	 */
	async publishToSlashpage(view: MarkdownView) {
		// 파일 내용 가져오기
		const fileContent = this.getCurrentFileContent(view);
		if (!fileContent) return;

		// 채널 설정 찾기
		const channelSettings = this.findChannelSettings(view.file!.path);
		if (!channelSettings) return;

		// API 호출
		await this.callSlashpageAPI(
			channelSettings.domainName,
			channelSettings.channelHash,
			channelSettings.tokenKey,
			fileContent.title,
			fileContent.content
		);
	}
}

class SlashpagePublisherSettingTab extends PluginSettingTab {
	plugin: SlashpagePublisherPlugin;
	folderMapContainer: HTMLElement;

	constructor(app: App, plugin: SlashpagePublisherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;
		containerEl.empty();

		containerEl.createEl('h2', {text: 'Slashpage Publisher Settings'});

		// 기본 설정 섹션 추가
		this.addDefaultSettingsSection(containerEl);

		// 폴더별 설정 섹션 추가
		this.addFolderMappingsSection(containerEl);
	}

	/**
	 * 기본 설정 섹션을 추가합니다
	 */
	addDefaultSettingsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', {text: 'Default Settings'});
		containerEl.createEl('p', {text: 'These settings will be used when no folder-specific settings are found.'});

		// Domain name setting
		this.addTextSetting(
			containerEl,
			'Default Domain Name',
			'Enter your Slashpage domain name',
			'my-domain',
			this.plugin.settings.defaultDomainName,
			async (value) => {
				this.plugin.settings.defaultDomainName = value;
				await this.plugin.saveSettings();
			}
		);

		// Channel hash setting
		this.addTextSetting(
			containerEl,
			'Default Channel Hash',
			'Enter your Slashpage channel hash',
			'channel-hash',
			this.plugin.settings.defaultChannelHash,
			async (value) => {
				this.plugin.settings.defaultChannelHash = value;
				await this.plugin.saveSettings();
			}
		);

		// Token key setting (displayed as password)
		this.addTextSetting(
			containerEl,
			'Default Token Key',
			'Enter your Slashpage webhook token key',
			'your-token-key',
			this.plugin.settings.defaultTokenKey,
			async (value) => {
				this.plugin.settings.defaultTokenKey = value;
				await this.plugin.saveSettings();
			},
			true // 비밀번호 형식으로 표시
		);
	}

	/**
	 * 폴더별 채널 설정 섹션을 추가합니다
	 */
	addFolderMappingsSection(containerEl: HTMLElement): void {
		containerEl.createEl('h3', {text: 'Folder-specific Channel Settings'});
		containerEl.createEl('p', {text: 'Configure specific folders to publish to different channels.'});

		// 폴더 매핑 컨테이너
		this.folderMapContainer = containerEl.createDiv('folder-mapping-container');
		
		// 기존 폴더 매핑 표시
		this.displayFolderMappings();

		// 새 폴더 매핑 추가 버튼
		new Setting(containerEl)
			.addButton(button => button
				.setButtonText('Add Folder Mapping')
				.setCta()
				.onClick(() => {
					this.addNewFolderMapping();
				}));
	}

	/**
	 * 새 폴더 매핑을 추가합니다
	 */
	addNewFolderMapping(): void {
		this.plugin.settings.folderMappings.push({
			folderPath: '',
			domainName: this.plugin.settings.defaultDomainName,
			channelHash: this.plugin.settings.defaultChannelHash,
			tokenKey: this.plugin.settings.defaultTokenKey
		});
		this.plugin.saveSettings();
		this.displayFolderMappings();
	}

	/**
	 * 텍스트 설정 필드를 추가합니다
	 */
	addTextSetting(
		containerEl: HTMLElement,
		name: string,
		desc: string,
		placeholder: string,
		value: string,
		onChange: (value: string) => Promise<void>,
		isPassword: boolean = false
	): void {
		const setting = new Setting(containerEl)
			.setName(name)
			.setDesc(desc);

		if (isPassword) {
			// 비밀번호 필드는 일반 텍스트 필드로 추가하되 CSS 클래스를 추가하여 구분
			setting.addText(text => {
				const textEl = text
					.setPlaceholder(placeholder)
					.setValue(value)
					.onChange(onChange);
				
				// 입력 요소에 직접 접근하여 type="password" 속성 추가
				// @ts-ignore - 내부 구현에 접근
				if (textEl.inputEl) {
					textEl.inputEl.type = 'password';
				}
				return textEl;
			});
		} else {
			setting.addText(text => text
				.setPlaceholder(placeholder)
				.setValue(value)
				.onChange(onChange));
		}
	}

	/**
	 * 폴더 매핑을 화면에 표시합니다
	 */
	displayFolderMappings(): void {
		this.folderMapContainer.empty();

		this.plugin.settings.folderMappings.forEach((mapping, index) => {
			const mappingEl = this.folderMapContainer.createDiv('folder-mapping');
			mappingEl.createEl('h4', {text: `Folder Mapping #${index + 1}`});

			// Folder path setting
			new Setting(mappingEl)
				.setName('Folder Path')
				.setDesc('Path to the folder (e.g.: folder/subfolder)')
				.addText(text => text
					.setValue(mapping.folderPath)
					.onChange(async (value) => {
						this.plugin.settings.folderMappings[index].folderPath = value;
						await this.plugin.saveSettings();
					}));

			// Domain name setting
			new Setting(mappingEl)
				.setName('Domain Name')
				.addText(text => text
					.setPlaceholder('my-domain')
					.setValue(mapping.domainName)
					.onChange(async (value) => {
						this.plugin.settings.folderMappings[index].domainName = value;
						await this.plugin.saveSettings();
					}));

			// Channel hash setting
			new Setting(mappingEl)
				.setName('Channel Hash')
				.addText(text => text
					.setPlaceholder('channel-hash')
					.setValue(mapping.channelHash)
					.onChange(async (value) => {
						this.plugin.settings.folderMappings[index].channelHash = value;
						await this.plugin.saveSettings();
					}));

			// Token key setting (displayed as password)
			new Setting(mappingEl)
				.setName('Token Key')
				.addText(text => {
					const textEl = text
						.setPlaceholder('your-token-key')
						.setValue(mapping.tokenKey)
						.onChange(async (value: string) => {
							this.plugin.settings.folderMappings[index].tokenKey = value;
							await this.plugin.saveSettings();
						});
					
					// 입력 요소에 직접 접근하여 type="password" 속성 추가
					// @ts-ignore - 내부 구현에 접근
					if (textEl.inputEl) {
						textEl.inputEl.type = 'password';
					}
					return textEl;
				});

			// 삭제 버튼
			new Setting(mappingEl)
				.addButton(button => button
					.setButtonText('Delete')
					.setWarning()
					.onClick(async () => {
						this.plugin.settings.folderMappings.splice(index, 1);
						await this.plugin.saveSettings();
						this.displayFolderMappings();
					}));
		});
	}
}
