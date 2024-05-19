import { format, createLogger, transports } from "winston";
import path from "path";
import chalk from "chalk";

// 创建一个自定义格式化选项
const myFormat = format.printf(({ level, message, timestamp }) => {
	// 格式化时间戳
	const formattedTimestamp = timestamp.slice(5, 19).replace("T", " ");
	// 根据日志级别设置颜色
	let coloredLevel;
	switch (level) {
		case "info":
			coloredLevel = chalk.blue(level.toUpperCase());
			break;
		case "error":
			coloredLevel = chalk.red(level.toUpperCase());
			break;
		case "warn":
			coloredLevel = chalk.yellow(level.toUpperCase());
			break;
		case "verbose":
			coloredLevel = chalk.green(level.toUpperCase());
			break;
		case "debug":
			coloredLevel = chalk.magenta(level.toUpperCase());
			break;
		case "silly":
			coloredLevel = chalk.cyan(level.toUpperCase());
			break;
		default:
			coloredLevel = level.toUpperCase();
	}
	return `${formattedTimestamp} [${coloredLevel}] ${path.basename(__dirname)} | ${message}`;
});

// 创建一个Winston Logger实例
const logger = createLogger({
	level: "info", // 设定日志级别为info
	format: format.combine(
		format.timestamp(), // 添加时间戳
		myFormat, // 使用自定义格式化选项
	),
	transports: [
		new transports.Console(), // 输出到控制台
		// 这里你也可以添加其他 transports，比如输出到文件等
	],
});

export default logger;
